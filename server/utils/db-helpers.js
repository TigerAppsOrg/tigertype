const db = require('../config/database');

/**
 * Utility functions for database operations
 */
const dbHelpers = {
  /**
   * Update user statistics based on race results
   * @param {number} userId - The user ID to update
   * @returns {Promise<Object>} Updated user statistics
   */
  async updateUserStats(userId) {
    try {
      // Get a client for transaction
      const client = await db.getClient();
      
      try {
        // Start transaction
        await client.query('BEGIN');
        
        // Calculate stats from race results
        const statsResult = await client.query(`
          SELECT 
            COUNT(*) as races_completed,
            AVG(wpm) as avg_wpm,
            AVG(accuracy) as avg_accuracy
          FROM race_results
          WHERE user_id = $1
        `, [userId]);
        
        const stats = statsResult.rows[0];
        
        // Update user record with new stats
        const updateResult = await client.query(`
          UPDATE users 
          SET 
            races_completed = $1,
            avg_wpm = $2,
            avg_accuracy = $3
          WHERE id = $4
          RETURNING *
        `, [
          stats.races_completed,
          stats.avg_wpm,
          stats.avg_accuracy,
          userId
        ]);
        
        // Commit transaction
        await client.query('COMMIT');
        
        return updateResult.rows[0];
        
      } catch (err) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error('Transaction error in updateUserStats:', err);
        throw err;
      } finally {
        // Release client back to pool
        client.release();
      }
    } catch (err) {
      console.error('Error updating user stats:', err);
      throw err;
    }
  },
  
  /**
   * Get leaderboard data
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Leaderboard data
   */
  async getLeaderboard(limit = 10) {
    try {
      const result = await db.query(`
        SELECT 
          u.netid,
          u.avg_wpm,
          u.avg_accuracy,
          u.races_completed
        FROM users u
        WHERE u.races_completed > 0
        ORDER BY u.avg_wpm DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (err) {
      console.error('Error getting leaderboard:', err);
      throw err;
    }
  },
  
  /**
   * Record a race result and update user stats
   * @param {Object} resultData - Race result data
   * @returns {Promise<Object>} Recorded race result
   */
  async recordRaceResult(resultData) {
    try {
      const { userId, lobbyId, snippetId, wpm, accuracy, completionTime } = resultData;
      
      // Get a client for transaction
      const client = await db.getClient();
      
      try {
        // Start transaction
        await client.query('BEGIN');
        
        // Insert race result
        const resultInsert = await client.query(`
          INSERT INTO race_results
            (user_id, lobby_id, snippet_id, wpm, accuracy, completion_time)
          VALUES
            ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [userId, lobbyId, snippetId, wpm, accuracy, completionTime]);
        
        // Update user stats
        await client.query(`
          WITH stats AS (
            SELECT 
              COUNT(*) as races_completed,
              AVG(wpm) as avg_wpm,
              AVG(accuracy) as avg_accuracy
            FROM race_results
            WHERE user_id = $1
          )
          UPDATE users
          SET 
            races_completed = stats.races_completed,
            avg_wpm = stats.avg_wpm,
            avg_accuracy = stats.avg_accuracy
          FROM stats
          WHERE id = $1
        `, [userId]);
        
        // Commit transaction
        await client.query('COMMIT');
        
        return resultInsert.rows[0];
        
      } catch (err) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error('Transaction error in recordRaceResult:', err);
        throw err;
      } finally {
        // Release client back to pool
        client.release();
      }
    } catch (err) {
      console.error('Error recording race result:', err);
      throw err;
    }
  }
};

module.exports = dbHelpers;