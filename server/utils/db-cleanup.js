/**
 * Database Cleanup Utilities
 * Functions to maintain database health and prevent connection/resource leaks
 */

const { pool } = require('../config/database');

/**
 * Clean up expired sessions from the user_sessions table
 * This helps prevent connection leaks caused by too many sessions
 */
const cleanupExpiredSessions = async () => {
  try {
    console.log('Cleaning up expired sessions...');
    const result = await pool.query(`
      DELETE FROM user_sessions
      WHERE expire < NOW()
      RETURNING sid
    `);
    
    const count = result.rowCount;
    console.log(`Cleaned up ${count} expired sessions`);
    return count;
  } catch (err) {
    console.error('Error cleaning up expired sessions:', err);
    throw err;
  }
};

/**
 * Check for and close idle connections that have been unused for a long time
 * This is a more aggressive approach if you're experiencing connection leaks
 * (we have been experiencing connection leaks)
 */
const forceCloseIdleConnections = async () => {
  try {
    console.log('Force closing idle database connections...');
    // This query identifies and terminates idle connections
    // that have been idle for more than 1 hour
    const result = await pool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND state = 'idle'
        AND state_change < NOW() - interval '1 hour'
    `);
    
    console.log(`Force closed ${result.rowCount} idle connections`);
    return result.rowCount;
  } catch (err) {
    console.error('Error force closing idle connections:', err);
    // Don't throw here as is a maintenance operation
    return 0;
  }
};

/**
 * Clean up old practice lobbies
 * When users restart tests or switch snippets in practice mode,
 * new practice lobbies are created, accumulating over time
 */
const cleanupPracticeLobbies = async () => {
  try {
    console.log('Cleaning up old practice lobbies...');
    
    // First identify old practice lobbies:
    // - Type is 'practice'
    // - Created more than 24 hours ago
    // - Status is 'finished' or has been 'waiting' for too long
    const result = await pool.query(`
      DELETE FROM lobbies
      WHERE type = 'practice'
      AND (
        (status = 'finished')
        OR
        (status = 'waiting' AND created_at < NOW() - interval '24 hours')
        OR
        (created_at < NOW() - interval '7 days')
      )
      RETURNING id, code
    `);
    
    const count = result.rowCount;
    console.log(`Cleaned up ${count} old practice lobbies`);
    
    // If we cleaned up a significant number, log some details
    if (count > 100) {
      console.log(`First 5 removed lobby IDs: ${result.rows.slice(0, 5).map(r => r.id).join(', ')}`);
    }
    
    return count;
  } catch (err) {
    console.error('Error cleaning up practice lobbies:', err);
    // Don't throw here as this is a maintenance operation
    return 0;
  }
};

module.exports = {
  cleanupExpiredSessions,
  forceCloseIdleConnections,
  cleanupPracticeLobbies
}; 