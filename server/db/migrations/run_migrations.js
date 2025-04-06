const { enhanceSchema, updateExistingSnippets, seedPrincetonSnippets } = require('./01_schema_enhancements');
const { initDB, seedTestData } = require('../index');
const { profileEnhancements } = require('./02_profile_enhancements');
const { addMissingStatsColumns } = require('./03_missing_stats_columns');

/**
 * Run all migrations in sequence for the prototype
 */
const runMigrations = async () => {
  try {
    console.log('Starting database migrations for TigerType prototype...');
    
    // Initialize base tables (if they don't exist)
    console.log('Step 1: Initializing base tables...');
    try {
      await initDB();
    } catch (err) {
      // If the error is about existing tables -> continue
      if (err.code === '42P16' || err.code === '42P07') {
        console.log('Some tables already exist, continuing with migrations...');
      } else {
        throw err;
      }
    }
    
    // Seed some test data (if needed)
    console.log('Step 2: Seeding initial test data...');
    await seedTestData();
    
    // Enhance schema with additional tables and fields
    console.log('Step 3: Enhancing schema with additional tables and fields...');
    await enhanceSchema();
    
    // Update existing snippets with word and character counts
    console.log('Step 4: Updating existing snippets with word and character counts...');
    await updateExistingSnippets();
    
    // Seed Princeton-themed snippets
    console.log('Step 5: Seeding Princeton-themed snippets...');
    await seedPrincetonSnippets();
    
    // Add profile enhancements (bio and avatar_url)
    console.log('Step 6: Adding profile enhancements...');
    await profileEnhancements();
    
    // Add missing stats columns (fastest_wpm)
    console.log('Step 7: Adding missing stats columns...');
    await addMissingStatsColumns();
    
    console.log('All migrations completed successfully!');
    
    // Exit the process
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    // Only return a non-zero exit code for srs errors
    // In production, choosign to allow the app to start even w/ migration warnings
    if (process.env.NODE_ENV === 'production') {
      console.log('Starting app despite migration warnings...');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
};

// Run migrations
runMigrations();