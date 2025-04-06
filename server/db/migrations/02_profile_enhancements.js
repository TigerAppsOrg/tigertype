const { pool } = require('../../config/database');

/**
 * Migration to add user profile enhancements:
 * - bio: Text field for user bio information
 * - avatar_url: URL to user's avatar image in S3
 */
const profileEnhancements = async () => {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Add bio and avatar_url columns to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(2048)
    `);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Profile enhancements migration completed successfully');
    return true;
  } catch (err) {
    // Rollback in case of errors
    await client.query('ROLLBACK');
    console.error('Error during profile enhancements migration:', err);
    throw err;
  } finally {
    // Release the client
    client.release();
  }
};

module.exports = {
  profileEnhancements
}; 