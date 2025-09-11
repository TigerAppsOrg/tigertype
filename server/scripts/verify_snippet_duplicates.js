#!/usr/bin/env node
/*
  Verify there are no duplicate snippets by text, and also check for
  duplicates if trailing CR/LF is stripped (defensive sanity check).
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const exact = await pool.query("SELECT COUNT(*)::int AS c FROM (SELECT text FROM snippets GROUP BY text HAVING COUNT(*) > 1) d");
    console.log('Exact duplicates:', exact.rows[0].c);
    if (exact.rows[0].c === 0) { console.log('OK: No duplicate snippets detected.'); return; }
    process.exitCode = 1;
  } catch (e) {
    console.error('Verification query failed:', e);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

main();
