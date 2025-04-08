const { pool } = require('../config/database');
const migrations = require('./migrations');
const { runMigrations, logDatabaseState } = migrations;

/**
 * Initialize the database
 * This function should be called when the server starts
 */
const initDB = async () => {
  try {
    console.log('Initializing database...');
    
    // Run all pending migrations
    await runMigrations();
    
    // Log the user stats after migrations
    await logUserStats();
    
    console.log('Database initialization complete');
    return true;
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  }
};

/**
 * Log user stats for debugging
 */
const logUserStats = async () => {
  const client = await pool.connect();
  try {
    // Query users with race results
    const usersWithRaces = await client.query(`
      SELECT u.id, u.netid, u.races_completed, u.avg_wpm, u.fastest_wpm,
             MAX(r.wpm) as max_wpm_from_results
      FROM users u
      LEFT JOIN race_results r ON u.id = r.user_id
      GROUP BY u.id, u.netid
      ORDER BY u.races_completed DESC
      LIMIT 10
    `);
    
    console.log('User stats check:');
    for (const user of usersWithRaces.rows) {
      console.log(`User ${user.netid} - races: ${user.races_completed}, avg_wpm: ${user.avg_wpm}, fastest_wpm: ${user.fastest_wpm}, max_wpm_from_results: ${user.max_wpm_from_results}`);
      
      // If there's a discrepancy between fastest_wpm and max_wpm_from_results
      if (user.fastest_wpm !== user.max_wpm_from_results && user.max_wpm_from_results !== null) {
        console.log(`  DISCREPANCY DETECTED for ${user.netid}: fastest_wpm=${user.fastest_wpm}, max_wpm_from_results=${user.max_wpm_from_results}`);
      }
    }
  } catch (err) {
    console.error('Error checking user stats:', err);
  } finally {
    client.release();
  }
};

// Seed initial data for testing
const seedTestData = async () => {
  try {
    // Check if our test snippets already exist by looking for a specific test snippet
    const { rows } = await pool.query("SELECT COUNT(*) FROM snippets WHERE text LIKE 'The quick brown fox%'");
    
    if (parseInt(rows[0].count) === 0) {
      // Add some test snippets
      await pool.query(`
        INSERT INTO snippets (text, source, category, difficulty)
        VALUES 
          ('The quick brown fox jumps over the lazy dog.', 'Typing Exercise', 'beginner', 1),
          ('Princeton University is located in Princeton, New Jersey and is one of the oldest universities in the United States.', 'Princeton Facts', 'medium', 2),
          ('To be or not to be, that is the question. Whether ''tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles, and by opposing end them.', 'Shakespeare', 'advanced', 3)
      `);
      console.log('Added test snippets');
    } else {
      console.log('Test snippets already exist, skipping insertion');
    }
  } catch (err) {
    console.error('Error seeding test data:', err);
  }
};

module.exports = {
  initDB,
  seedTestData,
  logDatabaseState,
  logUserStats
};