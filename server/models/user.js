const db = require('../config/database');

// User model for managing user-related database operations
const User = {
  // Find user by netid, including bio and avatar_url
  async findByNetid(netid) {
    try {
      const result = await db.query(
        'SELECT id, netid, last_login, created_at, bio, avatar_url FROM users WHERE netid = $1',
        [netid]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Error finding user by netid:', err);
      throw err;
    }
  },

  // Create a new user (bio and avatar_url will be null initially)
  async create(netid) {
    try {
      const result = await db.query(
        'INSERT INTO users (netid) VALUES ($1) RETURNING id, netid, last_login, created_at, bio, avatar_url',
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
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, netid, last_login, created_at, bio, avatar_url',
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
        // Optional: update last login on find as well, depending on desired behavior
        // For now, just update on create as before, but return the full user object
        // Might want to update last_login here too:
        // user = await this.updateLastLogin(user.id);
      }
      
      return user;
    } catch (err) {
      console.error('Error in findOrCreate:', err);
      throw err;
    }
  },

  // Update user bio
  async updateBio(userId, bio) {
    try {
      console.log('Calling updateBio with userId:', userId, 'and bio:', bio);
      const result = await db.query(
        'UPDATE users SET bio = $1 WHERE id = $2 RETURNING id, netid, last_login, created_at, bio, avatar_url',
        [bio, userId]
      );
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      return result.rows[0];
    } catch (err) {
      console.error('Error updating user bio:', err);
      throw err;
    }
  },

  // Update useravatar URL
  async updateAvatarUrl(userId, avatarUrl) {
    try {
      console.log('Calling updateAvatarUrl with userId:', userId, 'and avatarUrl:', avatarUrl);
      const result = await db.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, netid, last_login, created_at, bio, avatar_url',
        [avatarUrl, userId]
      );
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      return result.rows[0];
    } catch (err) {
      console.error('Error updating user avatar URL:', err);
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

// Debug check to verify functions exist
// console.log('User model has methods:', Object.keys(User));
// console.log('updateBio exists:', typeof User.updateBio === 'function');
// console.log('updateAvatarUrl exists:', typeof User.updateAvatarUrl === 'function');

module.exports = User;