const { pool } = require('../../config/database');

/**
 * Migration to enhance the schema with additional tables and fields
 * needed for the TigerType prototype application
 */
const enhanceSchema = async () => {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Enhance users table with basic stats fields for the prototype
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avg_wpm NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS avg_accuracy NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS races_completed INTEGER DEFAULT 0
    `);
    
    // Create lobby_players junction table for managing multiple players in lobbies
    await client.query(`
      CREATE TABLE IF NOT EXISTS lobby_players (
        lobby_id INTEGER REFERENCES lobbies(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_ready BOOLEAN DEFAULT FALSE,
        join_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (lobby_id, user_id)
      )
    `);
    
    // Enhance lobbies table with basic settings needed for prototype
    await client.query(`
      ALTER TABLE lobbies
      ADD COLUMN IF NOT EXISTS host_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS text_category VARCHAR(20) DEFAULT 'general'
    `);
    
    // Enhance snippets table with basic metadata
    await client.query(`
      ALTER TABLE snippets
      ADD COLUMN IF NOT EXISTS word_count INTEGER,
      ADD COLUMN IF NOT EXISTS character_count INTEGER,
      ADD COLUMN IF NOT EXISTS is_princeton_themed BOOLEAN DEFAULT FALSE
    `);
    
    // Add indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_race_results_user_id ON race_results(user_id);
      CREATE INDEX IF NOT EXISTS idx_race_results_lobby_id ON race_results(lobby_id);
      CREATE INDEX IF NOT EXISTS idx_lobby_players_lobby_id ON lobby_players(lobby_id);
      CREATE INDEX IF NOT EXISTS idx_lobby_players_user_id ON lobby_players(user_id);
    `);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Schema enhancement migration completed successfully');
  } catch (err) {
    // Rollback in case of errors
    await client.query('ROLLBACK');
    console.error('Error during schema enhancement migration:', err);
    throw err;
  } finally {
    // Release the client
    client.release();
  }
};

/**
 * Update existing snippet records to calculate word and character count
 */
const updateExistingSnippets = async () => {
  try {
    // Get all snippets
    const { rows } = await pool.query('SELECT id, text FROM snippets');
    
    for (const snippet of rows) {
      // Calculate word count (split by spaces and filter out empty strings)
      const wordCount = snippet.text.split(/\s+/).filter(Boolean).length;
      
      // Calculate character count (excluding whitespace)
      const characterCount = snippet.text.replace(/\s+/g, '').length;
      
      // Update the snippet
      await pool.query(
        'UPDATE snippets SET word_count = $1, character_count = $2 WHERE id = $3',
        [wordCount, characterCount, snippet.id]
      );
    }
    
    console.log(`Updated ${rows.length} existing snippets with word and character counts`);
  } catch (err) {
    console.error('Error updating existing snippets:', err);
    throw err;
  }
};

/**
 * Seed additional Princeton-themed snippets only if they don't already exist
 */
const seedPrincetonSnippets = async () => {
  const client = await pool.connect(); // Use a client for potential transaction needs or consistency
  try {
    // Check if Princeton-themed snippets already exist
    const checkResult = await client.query(
      'SELECT 1 FROM snippets WHERE is_princeton_themed = TRUE LIMIT 1'
    );

    if (checkResult.rowCount === 0) {
      console.log('No Princeton-themed snippets found, seeding...');
      // Add Princeton-themed snippets
      await client.query(`
        INSERT INTO snippets (text, source, category, difficulty, is_princeton_themed, word_count, character_count)
        VALUES
          ('Princeton University, founded in 1746 as the College of New Jersey, is a private Ivy League research university in Princeton, New Jersey. The university is one of the oldest institutions of higher education in the United States.', 'Princeton History', 'princeton', 2, TRUE, 36, 203),
          ('Nassau Hall, one of Princeton''s oldest buildings, was named for King William III, Prince of Orange, of the House of Nassau. When completed in 1756, it was the largest college building in North America.', 'Princeton Landmarks', 'princeton', 2, TRUE, 37, 183),
          ('Princeton''s undergraduate program operates on a liberal arts curriculum, providing students with both depth in a chosen academic department and breadth across disciplines through distribution requirements and interdisciplinary certificate programs.', 'Princeton Academics', 'princeton', 3, TRUE, 29, 209),
          ('The Princeton University Honor Code, established in 1893, is a code of academic integrity that prohibits students from cheating on exams. Students pledge their honor that they have not violated the Honor Code during examinations.', 'Princeton Traditions', 'princeton', 2, TRUE, 33, 188),
          ('The Princeton Tigers are the athletic teams of Princeton University. The school sponsors 38 varsity sports, making it one of the most diverse athletic programs among NCAA Division I schools.', 'Princeton Athletics', 'princeton', 1, TRUE, 26, 150),
          ('F. Scott Fitzgerald, author of The Great Gatsby, attended Princeton (then called the College of New Jersey) but did not graduate. His experiences at Princeton inspired his first novel, This Side of Paradise.', 'Princeton Alumni', 'princeton', 3, TRUE, 31, 173),
          ('Princeton''s endowment, valued at over $37 billion as of 2023, is one of the largest university endowments in the world, enabling the institution to provide generous financial aid packages to students.', 'Princeton Facts', 'princeton', 2, TRUE, 29, 165),
          ('The FitzRandolph Gate serves as the main entrance to Princeton''s campus. By tradition, students enter through the gate as freshmen during the Pre-rade ceremony and exit through it only after graduating.', 'Princeton Traditions', 'princeton', 2, TRUE, 33, 175),
          ('The Princeton University Art Museum houses over 112,000 works of art, from ancient to contemporary. Admission is free, and the collection is considered one of the finest university art collections in the United States.', 'Princeton Culture', 'princeton', 2, TRUE, 32, 179),
          ('The Senior Thesis is a hallmark of Princeton''s undergraduate education. Every Princeton senior writes a thesis, an independent research project that represents the culmination of their academic experience.', 'Princeton Academics', 'princeton', 2, TRUE, 25, 149)
      `);      
      console.log('Added Princeton-themed snippets.');
    } else {
      console.log('Princeton-themed snippets already exist, skipping seeding.');
    }
  } catch (err) {
    console.error('Error seeding Princeton snippets:', err);
    throw err; // Re-throw the error to allow the calling function (setupDatabase) to handle it if needed
  } finally {
    client.release(); // Make sure to release the client connection
  }
};

module.exports = {
  enhanceSchema,
  updateExistingSnippets,
  seedPrincetonSnippets
};