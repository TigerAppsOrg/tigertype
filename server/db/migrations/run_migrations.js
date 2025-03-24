const { enhanceSchema, updateExistingSnippets, seedPrincetonSnippets } = require('./01_schema_enhancements');
const { initDB, seedTestData } = require('../index');

/**
 * Run all migrations in sequence for the prototype
 */
const runMigrations = async () => {
  try {
    console.log('Starting database migrations for TigerType prototype...');
    
    // Initialize base tables (if they don't exist)
    console.log('Step 1: Initializing base tables...');
    await initDB();
    
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
    
    console.log('All migrations completed successfully!');
    
    // Exit the process
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

// Run migrations
runMigrations();