const db = require('../config/database');

// User model for managing user-related database operations
const User = {
  // Find user by netid
  async findByNetid(netid) {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE netid = $1',
        [netid]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Error finding user by netid:', err);
      throw err;
    }
  },

  // Create a new user
  async create(netid) {
    try {
      const result = await db.query(
        'INSERT INTO users (netid) VALUES ($1) RETURNING *',
        [netid]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  },

  // Update last login time
  async updateLastLogin(userId) {
    try {
      const result = await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Error updating last login:', err);
      throw err;
    }
  },

  // Find or create a user by netid
  async findOrCreate(netid) {
    try {
      let user = await this.findByNetid(netid);
      
      if (!user) {
        user = await this.create(netid);
      } else {
        await this.updateLastLogin(user.id);
      }
      
      return user;
    } catch (err) {
      console.error('Error in findOrCreate:', err);
      throw err;
    }
  },

  // Get a user's recent race results
  async getRecentResults(userId, limit = 10) {
    try {
      const result = await db.query(
        `SELECT r.id, r.wpm, r.accuracy, r.completion_time, 
         s.text as snippet_text, s.source, s.category, 
         r.created_at
         FROM race_results r
         JOIN snippets s ON r.snippet_id = s.id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (err) {
      console.error('Error getting recent results:', err);
      throw err;
    }
  },

  // Get a user's stats summary
  async getStats(userId) {
    try {
      const result = await db.query(
        `SELECT 
          COUNT(*) as total_races,
          AVG(wpm) as avg_wpm,
          MAX(wpm) as max_wpm,
          AVG(accuracy) as avg_accuracy,
          COUNT(DISTINCT snippet_id) as unique_snippets
         FROM race_results
         WHERE user_id = $1`,
        [userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Error getting user stats:', err);
      throw err;
    }
  }
};

module.exports = User;