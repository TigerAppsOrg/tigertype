const db = require('../config/database');
const pool = require('../config/database').pool;

// User model for managing user-related database operations
const User = {
  // Find user by ID
  async findById(userId) {
    if (!userId) return null;
    try {
      // Select all relevant fields including the new tutorial flag
      const result = await pool.query('SELECT id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial FROM users WHERE id = $1', [userId]);
      return result.rows[0];
    } catch (err) {
      console.error(`Error finding user by ID ${userId}:`, err);
      throw err;
    }
  },

  // Find user by netid, including bio, avatar_url, and tutorial flag
  async findByNetid(netid) {
    try {
      // Try to get all fields including fastest_wpm and has_completed_tutorial
      try {
        const result = await db.query(
          'SELECT id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial FROM users WHERE netid = $1',
          [netid]
        );
        return result.rows[0];
      } catch (error) {
        // Fallback logic (less likely needed now, but kept for safety)
        console.warn('Error in full findByNetid query, falling back to minimal query:', error.message);
        const fallbackResult = await db.query(
          'SELECT id, netid, last_login, created_at FROM users WHERE netid = $1',
          [netid]
        );

        // If we have a basic user, try to get other columns that might exist
        if (fallbackResult.rows[0]) {
          const user = fallbackResult.rows[0];

          // Function to safely fetch additional fields
          const fetchField = async (fieldName, query) => {
            try {
              const fieldResult = await db.query(query, [user.id]);
              if (fieldResult.rows[0]) {
                return fieldResult.rows[0][fieldName];
              }
            } catch (fieldError) {
              console.warn(`Could not get ${fieldName} field:`, fieldError.message);
            }
            return null; // Return null or a default value if fetch fails
          };

          // Fetch profile fields
          user.bio = await fetchField('bio', 'SELECT bio FROM users WHERE id = $1');
          user.avatar_url = await fetchField('avatar_url', 'SELECT avatar_url FROM users WHERE id = $1');

          // Fetch stats fields
          user.races_completed = await fetchField('races_completed', 'SELECT races_completed FROM users WHERE id = $1') ?? 0;
          user.avg_wpm = await fetchField('avg_wpm', 'SELECT avg_wpm FROM users WHERE id = $1') ?? 0;
          user.avg_accuracy = await fetchField('avg_accuracy', 'SELECT avg_accuracy FROM users WHERE id = $1') ?? 0;
          user.fastest_wpm = await fetchField('fastest_wpm', 'SELECT fastest_wpm FROM users WHERE id = $1') ?? 0;

          // Fetch tutorial flag
          user.has_completed_tutorial = await fetchField('has_completed_tutorial', 'SELECT has_completed_tutorial FROM users WHERE id = $1') ?? false;

          return user;
        }

        return fallbackResult.rows[0]; // Return basic user if found
      }
    } catch (err) {
      console.error('Error finding user by netid:', err);
      throw err;
    }
  },

  // Create a new user (bio and avatar_url will be null initially, tutorial flag defaults to false)
  async create(netid) {
    try {
      // Return all relevant fields including the new tutorial flag
      const result = await db.query(
        'INSERT INTO users (netid) VALUES ($1) RETURNING id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial',
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
      // Return all relevant fields including the new tutorial flag
      const result = await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial',
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
        user = await this.updateLastLogin(user.id);
      }

      // Ensure the user object always includes the tutorial flag, even if fetched via fallback
      if (user && user.has_completed_tutorial === undefined) {
         try {
            const flagResult = await db.query('SELECT has_completed_tutorial FROM users WHERE id = $1', [user.id]);
            user.has_completed_tutorial = flagResult.rows[0]?.has_completed_tutorial ?? false;
         } catch (flagError) {
             console.warn(`Could not fetch has_completed_tutorial for user ${user.id} in findOrCreate fallback:`, flagError.message);
             user.has_completed_tutorial = false; // Default to false on error
         }
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

      // Update bio and fetch all relevant fields
      const result = await db.query(
        'UPDATE users SET bio = $1 WHERE id = $2 RETURNING id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial',
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

  // Update user avatar URL
  async updateAvatarUrl(userId, avatarUrl) {
    try {
      console.log('Calling updateAvatarUrl with userId:', userId, 'and avatarUrl:', avatarUrl);

      // Update avatar URL and fetch all relevant fields
      const result = await db.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial',
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

  // Mark the user tutorial as completed
  async markTutorialAsCompleted(userId) {
    if (!userId) {
      throw new Error('User ID is required to mark tutorial as completed');
    }
    try {
      const result = await db.query(
        'UPDATE users SET has_completed_tutorial = true WHERE id = $1 RETURNING id, has_completed_tutorial',
        [userId]
      );
      if (result.rowCount === 0) {
        console.warn(`Attempted to mark tutorial complete for non-existent user ID: ${userId}`);
        return null; // Or throw an error if preferred
      }
      console.log(`Marked tutorial as completed for user ID: ${userId}`);
      return result.rows[0]; // Return the updated user id and flag status
    } catch (err) {
      console.error(`Error marking tutorial as completed for user ID ${userId}:`, err);
      throw err;
    }
  },

  // psuedo-code for getting lobby type done by ryan, actual sql implementation done by copilot
  // psuedo-code for getting position done by ryan, actual sql implementation done by copilot
  // Get a user's recent race results
  async getRecentResults(userId, limit = 3) {
    try {
      const result = await db.query(
        `SELECT r.id, r.wpm, r.accuracy, r.completion_time, 
         s.text as snippet_text, s.source, s.category, 
         r.created_at, l.type as lobby_type,
         CASE
           WHEN l.type IN ('public', 'private') THEN
             (SELECT COUNT(*) + 1 FROM race_results r2 
              WHERE r2.lobby_id = r.lobby_id 
              AND r2.completion_time < r.completion_time)
           ELSE NULL
         END as position
         FROM race_results r
         JOIN snippets s ON r.snippet_id = s.id
         LEFT JOIN lobbies l on r.lobby_id = l.id
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

  // Get a user's detailed stats including partial sessions
  async getDetailedStats(userId) {
    try {
      // Get sessions completed (races)
      const completedQuery = `
        SELECT 
          COUNT(*) as races_completed,
          COALESCE(SUM(CASE WHEN s.word_count IS NOT NULL THEN s.word_count ELSE 0 END), 0) as words_completed
        FROM race_results rr
        LEFT JOIN snippets s ON rr.snippet_id = s.id
        WHERE rr.user_id = $1
      `;
      
      // Get timed sessions completed
      const timedQuery = `
        SELECT 
          COUNT(*) as timed_completed,
          COALESCE(SUM(ROUND(wpm * (duration::decimal / 60))), 0) as timed_words
        FROM timed_leaderboard
        WHERE user_id = $1
      `;
      
      // Get partial sessions
      const partialQuery = `
        SELECT 
          COUNT(*) as partial_sessions,
          COALESCE(SUM(words_typed), 0) as partial_words
        FROM partial_sessions
        WHERE user_id = $1
      `;
      
      // Run all queries
      const [completedResult, timedResult, partialResult] = await Promise.all([
        db.query(completedQuery, [userId]),
        db.query(timedQuery, [userId]),
        db.query(partialQuery, [userId])
      ]);
      
      // Extract data
      const { races_completed, words_completed } = completedResult.rows[0];
      const { timed_completed, timed_words } = timedResult.rows[0];
      const { partial_sessions, partial_words } = partialResult.rows[0];
      
      // Calculate totals
      const totalSessionsStarted = parseInt(races_completed) + parseInt(timed_completed) + parseInt(partial_sessions);
      const totalSessionsCompleted = parseInt(races_completed) + parseInt(timed_completed);
      const totalWordsTyped = parseInt(words_completed) + parseInt(timed_words) + parseInt(partial_words);
      
      return {
        sessions_started: totalSessionsStarted,
        sessions_completed: totalSessionsCompleted, 
        races_completed: parseInt(races_completed),
        timed_completed: parseInt(timed_completed),
        words_typed: totalWordsTyped,
        partial_sessions: parseInt(partial_sessions)
      };
    } catch (err) {
      console.error('Error getting detailed user stats:', err);
      // Return default values on error
      return {
        sessions_started: 0,
        sessions_completed: 0,
        races_completed: 0,
        timed_completed: 0,
        words_typed: 0,
        partial_sessions: 0
      };
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
  },

  // Update user's average WPM, accuracy, and races completed
  // Conditionally updates based on whether the result is from a timed test
  async updateStats(userId, wpm, accuracy, isTimed) {
    if (!userId) return;
    try {
      // Fetch current stats using the correct internal call
      const user = await User.findById(userId); 
      if (!user) return;

      const currentAvgWpm = parseFloat(user.avg_wpm) || 0;
      const currentAvgAcc = parseFloat(user.avg_accuracy) || 0;
      const racesCompleted = user.races_completed || 0;

      if (isTimed) {
        // For timed tests, update WPM and accuracy but not races completed
        // Calculate new averages using existing races completed count
        const newAvgWpm = ((currentAvgWpm * racesCompleted) + wpm) / (racesCompleted + 1);
        const newAvgAcc = ((currentAvgAcc * racesCompleted) + accuracy) / (racesCompleted + 1);

        await pool.query(
          'UPDATE users SET avg_wpm = $1, avg_accuracy = $2 WHERE id = $3',
          [newAvgWpm.toFixed(2), newAvgAcc.toFixed(2), userId]
        );
        console.log(`Updated timed test stats for user ${userId}: WPM=${newAvgWpm.toFixed(2)}, Acc=${newAvgAcc.toFixed(2)}`);
      } else {
        // For regular races, update everything including races completed
        const newAvgWpm = ((currentAvgWpm * racesCompleted) + wpm) / (racesCompleted + 1);
        const newAvgAcc = ((currentAvgAcc * racesCompleted) + accuracy) / (racesCompleted + 1);
        const newRacesCompleted = racesCompleted + 1;

        await pool.query(
          'UPDATE users SET avg_wpm = $1, avg_accuracy = $2, races_completed = $3 WHERE id = $4',
          [newAvgWpm.toFixed(2), newAvgAcc.toFixed(2), newRacesCompleted, userId]
        );
        console.log(`Updated regular stats for user ${userId}: WPM=${newAvgWpm.toFixed(2)}, Acc=${newAvgAcc.toFixed(2)}, Races=${newRacesCompleted}`);
      }
    } catch (error) {
      console.error(`Error updating stats for user ${userId}:`, error);
    }
  },

  // Update user's fastest WPM if the new WPM is higher
  async updateFastestWpm(userId, wpm) {
    if (!userId) return;
    try {
      // Fetch current fastest_wpm using the correct internal call
      const user = await User.findById(userId); 
      if (!user) return;

      // Update fastest_wpm if the new wpm is higher
      const currentFastest = parseFloat(user.fastest_wpm) || 0;
      if (wpm > currentFastest) {
        await pool.query(
          'UPDATE users SET fastest_wpm = $1 WHERE id = $2',
          [wpm, userId]
        );
        console.log(`Updated fastest_wpm for user ${userId} to ${wpm}`);
      } else {
        console.log(`Skipping fastest_wpm update for user ${userId} (${wpm} not higher than ${currentFastest})`);
      }
    } catch (error) {
      console.error(`Error updating fastest_wpm for user ${userId}:`, error);
    }
  },

  // Increment only races_completed for private lobbies (words typed is tracked via race_results)
  async incrementPrivateRaceStats(userId) {
    if (!userId) return;
    try {
      const user = await User.findById(userId);
      if (!user) return;
      const newRacesCompleted = (user.races_completed || 0) + 1;
      await pool.query(
        'UPDATE users SET races_completed = $1 WHERE id = $2',
        [newRacesCompleted, userId]
      );
      console.log(`Incremented races_completed for user ${userId} (private lobby) to ${newRacesCompleted}`);
    } catch (error) {
      console.error(`Error incrementing private race stats for user ${userId}:`, error);
    }
  }
};

// Debug check to verify functions exist
// console.log('User model has methods:', Object.keys(User));
// console.log('updateBio exists:', typeof User.updateBio === 'function');
// console.log('updateAvatarUrl exists:', typeof User.updateAvatarUrl === 'function');

module.exports = User;
