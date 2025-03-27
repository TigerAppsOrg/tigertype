/**
 * Test Database Utility
 * 
 * This module provides utilities for creating an in-memory PostgreSQL database
 * for testing purposes using pg-mem.
 */

const { newDb } = require('pg-mem');

// Create a pg-mem instance for in-memory PostgreSQL testing
const createTestDb = async () => {
  // Create a new in-memory database
  const db = newDb();
  
  // Enable logging if needed
  // db.public.registerLogger(console.log);

  // Get a connection to the in-memory database
  const pool = db.adapters.createPg().Pool();
  
  // Create mock tables based on our schema
  await setupSchema(pool);
  
  return {
    pool,
    db,
    client: db.adapters.createPg(),
    cleanUp: async () => {
      await pool.end();
    }
  };
};

// Setup the database schema for testing
const setupSchema = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      netid VARCHAR(50) UNIQUE NOT NULL,
      display_name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      title VARCHAR(100),
      source VARCHAR(255),
      difficulty INTEGER DEFAULT 1,
      category VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS races (
      id SERIAL PRIMARY KEY,
      created_by INTEGER REFERENCES users(id),
      snippet_id INTEGER REFERENCES snippets(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      status VARCHAR(20) DEFAULT 'waiting',
      race_code VARCHAR(10) UNIQUE
    );

    CREATE TABLE IF NOT EXISTS race_participants (
      id SERIAL PRIMARY KEY,
      race_id INTEGER REFERENCES races(id),
      user_id INTEGER REFERENCES users(id),
      wpm INTEGER,
      accuracy NUMERIC(5,2),
      finished_at TIMESTAMP,
      started_at TIMESTAMP,
      status VARCHAR(20) DEFAULT 'joined'
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      races_completed INTEGER DEFAULT 0,
      best_wpm INTEGER DEFAULT 0,
      average_wpm NUMERIC(6,2) DEFAULT 0,
      average_accuracy NUMERIC(5,2) DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Add some test data
  await insertTestData(pool);
};

// Insert test data for our tests
const insertTestData = async (pool) => {
  // Insert test users
  await pool.query(`
    INSERT INTO users (netid, display_name) VALUES
    ('test1', 'Test User 1'),
    ('test2', 'Test User 2');
  `);

  // Insert test snippets
  await pool.query(`
    INSERT INTO snippets (content, title, source, difficulty, category) VALUES
    ('This is a test snippet for easy typing practice.', 'Easy Test', 'Test Source', 1, 'general'),
    ('This is a more complex test snippet with punctuation, numbers (123), and some longer words!', 'Medium Test', 'Test Source', 2, 'general');
  `);

  // Insert test races
  await pool.query(`
    INSERT INTO races (created_by, snippet_id, status, race_code) VALUES
    (1, 1, 'waiting', 'TEST001'),
    (2, 2, 'completed', 'TEST002');
  `);

  // Insert test race participants
  await pool.query(`
    INSERT INTO race_participants (race_id, user_id, wpm, accuracy, status) VALUES
    (1, 1, NULL, NULL, 'joined'),
    (2, 1, 80, 95.5, 'finished'),
    (2, 2, 75, 92.0, 'finished');
  `);

  // Insert test user stats
  await pool.query(`
    INSERT INTO user_stats (user_id, races_completed, best_wpm, average_wpm, average_accuracy) VALUES
    (1, 1, 80, 80.0, 95.5),
    (2, 1, 75, 75.0, 92.0);
  `);
};

module.exports = {
  createTestDb
}; 