#!/usr/bin/env node
/*
  Fix trailing empty lines in snippets.text

  - Detects rows where text ends with one or more CR/LF characters (empty final line)
  - By default runs in DRY-RUN mode and prints what would change
  - Pass --apply to perform updates

  Safety:
  - Skips updates that would create a duplicate (unique constraint on text)
  - Logs conflicting rows for manual follow-up
*/

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { pool } = require('../config/database');

const DRY_RUN = !process.argv.includes('--apply');

const sanitize = (s) => (typeof s === 'string' ? s.replace(/(?:\r?\n)+\s*$/u, '') : s);

async function main() {
  const client = await pool.connect();
  let updated = 0;
  let skippedSame = 0;
  let conflicts = 0;
  try {
    console.log(`Fix trailing newline script starting in ${DRY_RUN ? 'DRY-RUN' : 'APPLY'} mode`);

    const { rows } = await client.query(
      "SELECT id, text FROM snippets WHERE text ~ E'(\\r?\\n)+\\s*$' ORDER BY id"
    );
    if (rows.length === 0) {
      console.log('No snippets with trailing empty line found.');
      return;
    }
    console.log(`Found ${rows.length} snippet(s) ending with a trailing empty line.`);

    for (const row of rows) {
      const before = row.text;
      const after = sanitize(before);
      if (before === after) {
        skippedSame++;
        continue;
      }

      // Check for uniqueness conflicts post-sanitize
      const dup = await client.query('SELECT id FROM snippets WHERE text = $1 LIMIT 1', [after]);
      if (dup.rowCount > 0 && dup.rows[0].id !== row.id) {
        conflicts++;
        console.warn(
          `! Skipping id=${row.id} because sanitized text would duplicate existing id=${dup.rows[0].id}`
        );
        continue;
      }

      console.log(`- id=${row.id}: removing trailing empty line`);
      if (!DRY_RUN) {
        await client.query('UPDATE snippets SET text = $1 WHERE id = $2', [after, row.id]);
      }
      updated++;
    }

    console.log('\nSummary:');
    console.log(`  Updated:     ${updated}`);
    console.log(`  Skipped same:${skippedSame}`);
    console.log(`  Conflicts:   ${conflicts}`);

    if (!DRY_RUN) {
      console.log('\nDone.');
    } else {
      console.log("\nDRY-RUN complete. Re-run with --apply to make changes.");
    }
  } catch (err) {
    console.error('Error fixing snippets:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    // End pool to allow process to exit cleanly
    pool.end().catch(() => {});
  }
}

main();

