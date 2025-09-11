#!/usr/bin/env node
// Delete a snippet by ID, handling references in lobbies and race_results.
// Requires DB env (.env at project root) to be configured.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const promptly = require('promptly');
const { pool } = require('../../config/database');

async function deleteOne(snippetId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: snipRows } = await client.query(
      'SELECT id, category, difficulty FROM snippets WHERE id = $1 FOR UPDATE',
      [snippetId]
    );
    if (snipRows.length === 0) {
      console.warn(`Snippet ${snippetId} not found. Skipping.`);
      await client.query('ROLLBACK');
      return { snippetId, deleted: 0, updatedActive: 0, updatedOther: 0, updatedResults: 0, replacementId: null, notFound: true };
    }
    const { category, difficulty } = snipRows[0];

    const { rows: replRows } = await client.query(
      `SELECT id FROM snippets WHERE id <> $1 AND category = $2 AND difficulty = $3 ORDER BY random() LIMIT 1`,
      [snippetId, category, difficulty]
    );
    const replacementId = replRows[0]?.id || null;

    const statuses = ['waiting', 'countdown', 'racing'];
    const { rowCount: updatedActive } = await client.query(
      `UPDATE lobbies
         SET snippet_id = $2
       WHERE snippet_id = $1 AND status = ANY($3::text[])`,
      [snippetId, replacementId, statuses]
    );

    const { rowCount: updatedOther } = await client.query(
      `UPDATE lobbies
         SET snippet_id = NULL
       WHERE snippet_id = $1 AND status <> ALL($2::text[])`,
      [snippetId, statuses]
    );

    const { rowCount: updatedResults } = await client.query(
      `UPDATE race_results SET snippet_id = NULL WHERE snippet_id = $1`,
      [snippetId]
    );

    const { rowCount: deleted } = await client.query(
      `DELETE FROM snippets WHERE id = $1`,
      [snippetId]
    );

    await client.query('COMMIT');
    return { snippetId, deleted, updatedActive, updatedOther, updatedResults, replacementId, notFound: false };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error(`Delete failed for snippet ${snippetId}:`, err.message || err);
    return { snippetId, error: err.message || String(err) };
  } finally {
    client.release();
  }
}

async function main() {
  let inputs = process.argv.slice(2);
  if (!inputs.length) {
    const ans = await promptly.prompt('Enter snippet ID(s) (comma or space separated):');
    inputs = [ans];
  }
  const idSet = new Set();
  for (const chunk of inputs) {
    String(chunk)
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(s => {
        const n = Number(s);
        if (Number.isInteger(n) && n > 0) idSet.add(n);
      });
  }
  const ids = Array.from(idSet);
  if (!ids.length) {
    console.error('No valid snippet IDs provided.');
    process.exit(1);
  }

  console.log(`Deleting ${ids.length} snippet(s): ${ids.join(', ')}`);
  const results = [];
  for (const id of ids) {
    const res = await deleteOne(id);
    results.push(res);
    if (!res.error) {
      console.log('--- Summary ---');
      console.log(`Snippet ${id}: deleted=${res.deleted}, active_reassigned=${res.updatedActive}, other_nulled=${res.updatedOther}, results_nulled=${res.updatedResults}, replacement=${res.replacementId ?? 'NULL'}`);
    }
  }

  const failed = results.filter(r => r.error).length;
  const notFound = results.filter(r => r.notFound).length;
  console.log(`Done. Success: ${results.length - failed - notFound}, Not found: ${notFound}, Failed: ${failed}`);
}

main();
