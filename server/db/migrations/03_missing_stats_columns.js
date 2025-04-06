const { pool } = require('../../config/database');

/**
 * Migration to add the missing fastest_wpm column to the users table
 */
const addMissingStatsColumns = async () => {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if the fastest_wpm column already exists
    const checkColumnResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'fastest_wpm'
    `);
    
    if (checkColumnResult.rows.length === 0) {
      console.log('Adding missing fastest_wpm column to users table...');
      
      // Add the fastest_wpm column if it doesn't exist
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS fastest_wpm NUMERIC(5,2) DEFAULT 0
      `);
      
      console.log('Successfully added fastest_wpm column to users table.');
    } else {
      console.log('fastest_wpm column already exists in users table.');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Missing stats columns migration completed successfully');
    return true;
  } catch (err) {
    // Rollback in case of errors
    await client.query('ROLLBACK');
    console.error('Error during missing stats columns migration:', err);
    throw err;
  } finally {
    // Release the client
    client.release();
  }
};

module.exports = {
  addMissingStatsColumns
}; 