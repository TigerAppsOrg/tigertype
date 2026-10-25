// Retain 90 days of login history so recent DAU can be recalculated.
async function cleanupLoginEvents(pool, now = new Date()) {
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const { rowCount } = await pool.query(
    'DELETE FROM login_events WHERE logged_in_at < $1',
    [cutoff]
  );
  console.log(`Deleted ${rowCount} login events older than 90 days`);
  return rowCount;
}

async function main() {
  require('dotenv').config();
  const { pool } = require('../server/config/database');
  try {
    await cleanupLoginEvents(pool);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Login event cleanup failed:', error.code || error.message || error.name);
    process.exitCode = 1;
  });
}

module.exports = { cleanupLoginEvents };
