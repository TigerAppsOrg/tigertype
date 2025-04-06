/**
 * Database initialization script - runs when the server starts
 */
const { initDB, seedTestData } = require('./index');
const { enhanceSchema, updateExistingSnippets, seedPrincetonSnippets } = require('./migrations/01_schema_enhancements');
const { profileEnhancements } = require('./migrations/02_profile_enhancements');
const { addMissingStatsColumns } = require('./migrations/03_missing_stats_columns');

/**
 * Initialize the database for the TigerType application
 */
const setupDatabase = async () => {
  try {
    console.log('Setting up database for TigerType...');
    
    // Create base tables if they don't exist
    console.log('Creating base tables...');
    try {
      await initDB();
    } catch (err) {
      // If the error is about existing tables, we can continue
      if (err.code === '42P16' || err.code === '42P07') {
        console.log('Some tables already exist, continuing with migrations...');
      } else {
        throw err;
      }
    }
    
    // Add test snippets if needed
    console.log('Adding test snippets if needed...');
    await seedTestData();
    
    // Enhance schema with additional tables and fields
    console.log('Enhancing schema...');
    await enhanceSchema();
    
    // Update snippets with word and character counts
    console.log('Updating snippet metadata...');
    await updateExistingSnippets();
    
    // Add Princeton-themed snippets
    console.log('Adding Princeton-themed snippets...');
    await seedPrincetonSnippets();
    
    // Add profile enhancements (bio and avatar_url)
    console.log('Adding profile enhancements...');
    await profileEnhancements();
    
    // Add missing stats columns (fastest_wpm)
    console.log('Adding missing stats columns...');
    await addMissingStatsColumns();
    
    console.log('Database setup complete!');
    return true;
  } catch (err) {
    console.error('Database setup failed:', err);
    // Still return true to allow server to start even if DB setup fails
    // The server will run with limited functionality
    return true;
  }
};

module.exports = setupDatabase;