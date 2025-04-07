const { pool } = require('../config/database');
const { runMigrations } = require('./migrations');

/**
 * Initialize the database
 */
const initDB = async () => {
  try {
    console.log('Initializing database...');
    
    // Run all pending migrations
    await runMigrations();
    
    console.log('Database initialization complete');
    return true;
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
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
  seedTestData
};