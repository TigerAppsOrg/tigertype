#!/usr/bin/env node
// Delete a snippet by ID, handling references in lobbies and race_results.
// Requires DB env (.env at project root) to be configured.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const promptly = require('promptly');
const { pool } = require('../../config/database');

async function main() {
  let idArg = process.argv[2];
  if (!idArg) {
    idArg = await promptly.prompt('Enter snippet ID to delete:');
  }
  const snippetId = Number(idArg);
  if (!Number.isInteger(snippetId) || snippetId <= 0) {
    console.error('Invalid snippet ID.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Load snippet to capture category/difficulty for replacement
    const { rows: snipRows } = await client.query(
      'SELECT id, category, difficulty FROM snippets WHERE id = $1 FOR UPDATE',
      [snippetId]
    );
    if (snipRows.length === 0) {
      console.error(`Snippet ${snippetId} not found.`);
      await client.query('ROLLBACK');
      process.exit(1);
    }
    const { category, difficulty } = snipRows[0];

    // Reassign active lobbies (waiting/countdown/racing) to a replacement snippet
    const { rows: replRows } = await client.query(
      `SELECT id FROM snippets WHERE id <> $1 AND category = $2 AND difficulty = $3 ORDER BY random() LIMIT 1`,
      [snippetId, category, difficulty]
    );
    const replacementId = replRows[0]?.id || null;

    // Update lobbies referencing this snippet
    const statuses = ['waiting', 'countdown', 'racing'];
    const { rowCount: updatedActive } = await client.query(
      `UPDATE lobbies
         SET snippet_id = $2
       WHERE snippet_id = $1 AND status = ANY($3::text[])`,
      [snippetId, replacementId, statuses]
    );

    // For finished lobbies (or any others), set to NULL (if replacement is null, it will be null for all)
    const { rowCount: updatedOther } = await client.query(
      `UPDATE lobbies
         SET snippet_id = NULL
       WHERE snippet_id = $1 AND status <> ALL($2::text[])`,
      [snippetId, statuses]
    );

    // If FK is already ON DELETE SET NULL, the next step is redundant,
    // but executing it keeps behavior consistent if migration hasn’t run yet.
    const { rowCount: updatedResults } = await client.query(
      `UPDATE race_results SET snippet_id = NULL WHERE snippet_id = $1`,
      [snippetId]
    );

    // Finally, delete the snippet
    const { rowCount: deleted } = await client.query(
      `DELETE FROM snippets WHERE id = $1`,
      [snippetId]
    );

    await client.query('COMMIT');
    console.log('--- Delete Snippet Summary ---');
    console.log(`Snippet deleted: ${deleted}`);
    console.log(`Active lobbies reassigned: ${updatedActive}`);
    console.log(`Other lobbies nulled: ${updatedOther}`);
    console.log(`Race results nulled: ${updatedResults}`);
    if (!replacementId) {
      console.warn('No replacement snippet found for active lobbies; affected lobbies now have NULL snippet_id.');
    } else {
      console.log(`Replacement snippet used for active lobbies: ${replacementId}`);
    }
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Delete failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

main();
