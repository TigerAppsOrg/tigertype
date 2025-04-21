/**
 * Migration 9: Add has_completed_tutorial column to users table
 */
module.exports = {
  version: 9,
  description: 'Add has_completed_tutorial column to users table',
  up: async (client) => {
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS has_completed_tutorial BOOLEAN DEFAULT FALSE;
    `);
    console.log('Migration complete: Added has_completed_tutorial column to users table');
  },
  down: async (client) => {
    await client.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS has_completed_tutorial;
    `);
    console.log('Migration reverted: Removed has_completed_tutorial column from users table');
  }
};
