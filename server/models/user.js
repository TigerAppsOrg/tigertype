const db = require('../config/database');
const pool = require('../config/database').pool;
const { getTimedLeaderboard } = require('../db'); // Import getTimedLeaderboard

// User model for managing user-related database operations
const User = {
  // Find user by ID
  async findById(userId) {
    if (!userId) return null;
    try {
      // Select all relevant fields including the new tutorial flag
      const result = await pool.query('SELECT id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial, selected_title_id FROM users WHERE id = $1', [userId]);
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
          'SELECT id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial, selected_title_id FROM users WHERE netid = $1',
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
        // Fetch selected title
        user.selected_title_id = await fetchField('selected_title_id', 'SELECT selected_title_id FROM users WHERE id = $1');

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
        'INSERT INTO users (netid) VALUES ($1) RETURNING id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial, selected_title_id',
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
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial, selected_title_id',
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
        'UPDATE users SET bio = $1 WHERE id = $2 RETURNING id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial, selected_title_id',
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
        'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, netid, last_login, created_at, bio, avatar_url, races_completed, avg_wpm, avg_accuracy, fastest_wpm, has_completed_tutorial, selected_title_id',
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

  // Update user's selected title
  async updateTitle(userId, titleId) {
    if (!userId) {
      throw new Error('User ID is required to update selected title');
    }
    try {
      // titleId can be null to deselect
      const result = await pool.query(
        'UPDATE users SET selected_title_id = $1 WHERE id = $2 RETURNING id, selected_title_id',
        [titleId, userId] // Pass titleId directly (can be null)
      );
      if (result.rowCount === 0) {
        // Don't throw, just warn if user not found, might happen in race conditions
        console.warn(`User not found when trying to update title for ID: ${userId}`);
        return null;
      }
      return result.rows[0];
    } catch (err) {
      console.error(`Error updating selected title for user ${userId} to ${titleId}:`, err);
      throw err; // Re-throw other errors
    }
  },

  // Get a user's recent race results
  async getRecentResults(userId, limit = 3) {
    if (!userId) return [];
    try {
      const result = await db.query(
        `SELECT r.id, r.wpm, r.accuracy, r.completion_time, 
          s.text as snippet_text, s.source, s.category, 
          r.created_at, COALESCE(l.type, 'Practice') as lobby_type,
        CASE
         WHEN l.type IN ('public', 'private') THEN
           (SELECT COUNT(*) + 1 FROM race_results r2 
            WHERE r2.lobby_id = r.lobby_id 
            AND r2.completion_time < r.completion_time)
         ELSE NULL
        END as position
        FROM race_results r
        LEFT JOIN snippets s ON r.snippet_id = s.id
        LEFT JOIN lobbies l ON r.lobby_id = l.id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error(`Error getting recent results for user ${userId}:`, error);
      return [];
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
  async updateStats(userId, wpm, accuracy, isTimed) {
    if (!userId) return;
    let user; // Define user variable outside try block
    try {
      // Fetch current stats using the correct internal call
      user = await User.findById(userId);
      if (!user) {
        console.warn(`User not found when trying to update stats for ID: ${userId}`);
        return;
      }

      const currentAvgWpm = parseFloat(user.avg_wpm) || 0;
      const currentAvgAcc = parseFloat(user.avg_accuracy) || 0;
      // IMPORTANT: Use detailed stats for an accurate count of completed sessions affecting average
      const detailedStats = await this.getDetailedStats(userId);
      // Use sessions_completed if available, otherwise fallback gracefully but log warning
      const sessionsCompleted = detailedStats?.sessions_completed ?? user.races_completed ?? 0;
      if (detailedStats?.sessions_completed === undefined) {
         console.warn(`Detailed stats missing sessions_completed for user ${userId}, falling back to races_completed for average calculation.`);
      }

      let newAvgWpm, newAvgAcc;

      if (sessionsCompleted > 0) {
        newAvgWpm = ((currentAvgWpm * sessionsCompleted) + wpm) / (sessionsCompleted + 1);
        newAvgAcc = ((currentAvgAcc * sessionsCompleted) + accuracy) / (sessionsCompleted + 1);
      } else {
        // First completed session
        newAvgWpm = wpm;
        newAvgAcc = accuracy;
      }

      // Always update avg WPM and Acc. Only update races_completed for non-timed races.
      if (isTimed) {
        await pool.query(
          'UPDATE users SET avg_wpm = $1, avg_accuracy = $2 WHERE id = $3',
          [newAvgWpm.toFixed(2), newAvgAcc.toFixed(2), userId]
        );
        console.log(`Updated timed test stats for user ${userId}: WPM=${newAvgWpm.toFixed(2)}, Acc=${newAvgAcc.toFixed(2)}`);
      } else {
        const newRacesCompleted = (user.races_completed || 0) + 1;
        await pool.query(
          'UPDATE users SET avg_wpm = $1, avg_accuracy = $2, races_completed = $3 WHERE id = $4',
          [newAvgWpm.toFixed(2), newAvgAcc.toFixed(2), newRacesCompleted, userId]
        );
        console.log(`Updated regular race stats for user ${userId}: WPM=${newAvgWpm.toFixed(2)}, Acc=${newAvgAcc.toFixed(2)}, Races=${newRacesCompleted}`);
      }

      // Check for fastest WPM update separately
      await this.updateFastestWpm(userId, wpm); // This now calls title checks internally

    } catch (error) {
      console.error(`Error updating stats for user ${userId}:`, error);
    } finally {
        // Check titles regardless of whether it was timed or race, as avg WPM changed
        // And also call exclusive title check
        if (user) { // Ensure user was successfully fetched
            await this.checkAndAwardTitles(userId);
            await this.updateExclusiveTitles(userId); // Pass current user ID for context if needed
        }
    }
  },

  // Update user's fastest WPM if the new WPM is higher
  async updateFastestWpm(userId, wpm) {
    if (!userId) return;
    let user; // Define user outside try
    let updatedFastest = false;
    try {
      // Fetch current fastest_wpm using the correct internal call
      user = await User.findById(userId);
      if (!user) {
          console.warn(`User not found when trying to update fastest WPM for ID: ${userId}`);
          return;
      }

      // Update fastest_wpm if the new wpm is higher
      const currentFastest = parseFloat(user.fastest_wpm) || 0;
      if (wpm > currentFastest) {
        await pool.query(
          'UPDATE users SET fastest_wpm = $1 WHERE id = $2',
          [wpm.toFixed(2), userId] // Store with precision
        );
        console.log(`Updated fastest_wpm for user ${userId} to ${wpm.toFixed(2)}`);
        updatedFastest = true;

      } else {
        console.log(`Skipping fastest_wpm update for user ${userId} (${wpm} not higher than ${currentFastest})`);
      }
    } catch (error) {
      console.error(`Error updating fastest_wpm for user ${userId}:`, error);
    } finally {
        // Check titles only if fastest WPM was updated OR if user object exists (in case other checks needed)
        if (updatedFastest && user) {
            await this.checkAndAwardBadges(userId); // Check badges dependent on fastest_wpm
            await this.checkAndAwardTitles(userId); // Check titles dependent on fastest_wpm
            await this.updateExclusiveTitles(userId); // Re-evaluate exclusive titles
        } else if (user) {
            // If fastest WPM didn't change, still potentially re-evaluate exclusives like Eisgruber if the WPM came from a 15s test
            // We'll handle the Eisgruber trigger more specifically elsewhere (e.g., after saving timed results)
            // But check others like Fastest/Slowest avg WPM might have changed even if fastest didn't
             await this.updateExclusiveTitles(userId);
        }
    }
  },

  // Increment only races_completed for private lobbies (words typed is tracked via race_results)
  async incrementPrivateRaceStats(userId) {
    if (!userId) return;
    try {
      const user = await User.findById(userId);
      if (!user) {
           console.warn(`User not found when trying to increment private race stats for ID: ${userId}`);
           return;
      }
      const newRacesCompleted = (user.races_completed || 0) + 1;
      await pool.query(
        'UPDATE users SET races_completed = $1 WHERE id = $2',
        [newRacesCompleted, userId]
      );
      console.log(`Incremented races_completed for user ${userId} (private lobby) to ${newRacesCompleted}`);
      // Also check titles/badges after incrementing race count
      await this.checkAndAwardBadges(userId);
      await this.checkAndAwardTitles(userId);
      // No need to call updateExclusiveTitles here as avg/fastest WPM didn't change
    } catch (error) {
      console.error(`Error incrementing private race stats for user ${userId}:`, error);
    }
  },

  // Get a user's badges
  async getBadges(userId, includeUnselected = true) {
    if (!userId) return [];
    try {
      const result = await pool.query(
        `SELECT b.id, b.key, b.name, b.description, b.icon_url, u.awarded_at, u.is_selected
        FROM badges b
        JOIN user_badges u on b.id = u.badge_id
        WHERE u.user_id = $1 ${includeUnselected ? '' : 'AND u.is_selected = true'}
        ORDER BY u.awarded_at DESC`,
        [userId]
      );
      console.log(`Got ${result.rows.length} badges for user: ${userId}`);
      return result.rows;
    } catch (error) {
      console.error(`Error getting badges for user ${userId}:`, error);
      return [];
    }
  },

  // used copilot for this - Ryan
  async awardBadge(userId, badgeKey) {
    if (!userId) return;
    if (!badgeKey) return;

    try {
      // Check if user already has this badge
      const existingBadge = await pool.query(`
      SELECT u.badge_id FROM user_badges u JOIN badges b ON u.badge_id = b.id
      WHERE u.user_id = $1 AND b.key = $2
      `, [userId, badgeKey]);

      if (existingBadge.rows.length > 0) {
        return { awarded: false, already_awarded: true };
      }

      // Get the badge ID
      const badgeResult = await db.query(`
      SELECT id FROM badges WHERE key = $1
      `, [badgeKey]);

      if (badgeResult.rows.length === 0) {
        throw new Error(`Badge with key ${badgeKey} not found`);
      }

      const badgeId = badgeResult.rows[0].id;

      // Award the badge, defaulting to not selected for display
      await db.query(`
      INSERT INTO user_badges (user_id, badge_id, awarded_at, is_selected)
      VALUES ($1, $2, CURRENT_TIMESTAMP, FALSE)
      `, [userId, badgeId]);

      console.log(`Awarded badge ${badgeKey} for user: ${userId}`);

      // Get badge details to return
      const awardedBadge = await db.query(`
      SELECT b.id, b.key, b.name, b.description, b.icon_url, u.awarded_at
      FROM badges b
      JOIN user_badges u ON b.id = u.badge_id
      WHERE u.user_id = $1 AND b.id = $2
      `, [userId, badgeId]);

      return {
        awarded: true,
        badge: awardedBadge.rows[0]
      };
    } catch (err) {
      console.error('Error awarding badge:', err);
      throw err;
    }
  },

  // Update which badges are publicly displayed
  async setSelectedBadges(userId, badgeIds) {
    if (!userId) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE user_badges SET is_selected = FALSE WHERE user_id = $1', [userId]);
      if (badgeIds && badgeIds.length > 0) {
        await client.query(
          'UPDATE user_badges SET is_selected = TRUE WHERE user_id = $1 AND badge_id = ANY($2::int[])',
          [userId, badgeIds]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating badge selections:', err);
      throw err;
    } finally {
      client.release();
    }
  },

  // used copilot for this - Ryan
  // Check user stats against badge criteria and award any earned badges
  async checkAndAwardBadges(userId) {
    try {
      // Get user's current stats
      const user = await this.findById(userId);
      if (!user) return [];

      // Get all badges that the user doesn't already have
      const availableBadges = await db.query(`
      SELECT b.id, b.key, b.name, b.criteria_type, b.criteria_value
      FROM badges b
      WHERE NOT EXISTS (
        SELECT 1 FROM user_badges u
        WHERE u.badge_id = b.id AND u.user_id = $1
      )
      `, [userId]);

      console.log(`Got unachieved badges for user: ${userId}`);

      const newlyAwardedBadges = [];

      // Check each badge criteria
      for (const badge of availableBadges.rows) {
        let awardBadge = false;

        switch (badge.criteria_type) {
          case 'races_completed':
            awardBadge = user.races_completed >= badge.criteria_value;
            break;
          case 'avg_wpm':
            awardBadge = parseFloat(user.avg_wpm) >= badge.criteria_value;
            break;
          case 'fastest_wpm':
            awardBadge = parseFloat(user.fastest_wpm) >= badge.criteria_value;
            break;
        }

        if (awardBadge) {
          const result = await this.awardBadge(userId, badge.key);
          if (result.awarded) {
            newlyAwardedBadges.push(result.badge);
          }
        }
      }

      return newlyAwardedBadges;
    } catch (err) {
      console.error('Error checking and awarding badges:', err);
      return [];
    }
  },
  
  // Get a user's *unlocked* titles, indicating which is equipped
  async getTitles(userId) {
    if (!userId) return [];
    try {
      const result = await pool.query(
        `SELECT
           t.id,
           t.key,
           t.name,
           t.description,
           ut.awarded_at,
           (t.id = u.selected_title_id) as is_equipped -- Check if this title is the user's selected one
         FROM titles t
         JOIN user_titles ut ON t.id = ut.title_id -- Consistent title_id naming
         JOIN users u ON ut.user_id = u.id -- Join users table to check selected_title_id
         WHERE ut.user_id = $1
         ORDER BY t.name ASC`, // Order alphabetically for consistent display
        [userId]
      );
      console.log(`Got ${result.rows.length} achieved titles for user: ${userId}`);
      return result.rows;
    } catch (error) {
      console.error(`Error getting titles for user ${userId}:`, error);
      return []; // Return empty array on error
    }
  },

  // Get *all* available titles (for displaying in profile modal etc.)
  async getAllTitles() {
      try {
          const result = await pool.query(
              `SELECT id, key, name, description, criteria_type, criteria_value
               FROM titles
               ORDER BY name ASC`
          );
          return result.rows;
      } catch (error) {
          console.error('Error getting all titles:', error);
          return [];
      }
  },

  // Award a title to a user
  async awardTitle(userId, titleKey) {
    if (!userId || !titleKey) return { awarded: false, error: 'Missing userId or titleKey' };

    let client;
    try {
      client = await pool.connect(); // Use a client for transaction
      await client.query('BEGIN');

      // 1. Find the title ID from the key
      const titleResult = await client.query('SELECT id FROM titles WHERE key = $1', [titleKey]);
      if (titleResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error(`Title with key ${titleKey} not found`);
        return { awarded: false, error: `Title key ${titleKey} not found` };
      }
      const titleId = titleResult.rows[0].id;

      // 2. Check if the user already has this title
      const existingTitle = await client.query(
        'SELECT 1 FROM user_titles WHERE user_id = $1 AND title_id = $2', // Consistent title_id naming
        [userId, titleId]
      );

      if (existingTitle.rows.length > 0) {
        await client.query('COMMIT'); // Commit even if already awarded
        console.log(`User ${userId} already has title ${titleKey} (ID: ${titleId})`);
        return { awarded: false, already_awarded: true, title_id: titleId };
      }

      // 3. Award the title
      await client.query(
        'INSERT INTO user_titles (user_id, title_id, awarded_at) VALUES ($1, $2, CURRENT_TIMESTAMP)', // Consistent title_id naming
        [userId, titleId]
      );

      // 4. Fetch the details of the awarded title (including description)
      const awardedTitle = await client.query(
        'SELECT id, key, name, description FROM titles WHERE id = $1',
        [titleId]
      );

      await client.query('COMMIT'); // Commit the transaction
      console.log(`Awarded title ${titleKey} (ID: ${titleId}) to user ${userId}`);

      return {
        awarded: true,
        title: { ...awardedTitle.rows[0], awarded_at: new Date().toISOString() } // Add awarded_at timestamp
      };
    } catch (err) {
      if (client) {
        await client.query('ROLLBACK'); // Rollback on error
      }
      console.error(`Error awarding title ${titleKey} to user ${userId}:`, err);
      return { awarded: false, error: err.message || 'Database error during title award' };
    } finally {
      if (client) {
        client.release();
      }
    }
  },

  // Remove a specific title from a user
  async removeTitle(userId, titleKey) {
      if (!userId || !titleKey) return { removed: false, error: 'Missing userId or titleKey' };

      let client;
      try {
          client = await pool.connect();
          await client.query('BEGIN');

          // 1. Find the title ID
          const titleResult = await client.query('SELECT id FROM titles WHERE key = $1', [titleKey]);
          if (titleResult.rows.length === 0) {
              await client.query('ROLLBACK');
              return { removed: false, error: `Title key ${titleKey} not found` };
          }
          const titleId = titleResult.rows[0].id;

          // 2. Check if the user's currently equipped title is this one
          const userResult = await client.query('SELECT selected_title_id FROM users WHERE id = $1', [userId]);
          const currentSelectedTitleId = userResult.rows[0]?.selected_title_id;

          // 3. If it is equipped, unequip it (set selected_title_id to null)
          if (currentSelectedTitleId === titleId) {
              await client.query('UPDATE users SET selected_title_id = NULL WHERE id = $1', [userId]);
              console.log(`Unequipped title ${titleKey} (ID: ${titleId}) for user ${userId}`);
          }

          // 4. Remove the title from user_titles
          const deleteResult = await client.query(
              'DELETE FROM user_titles WHERE user_id = $1 AND title_id = $2',
              [userId, titleId]
          );

          await client.query('COMMIT');

          if (deleteResult.rowCount > 0) {
              console.log(`Removed title ${titleKey} (ID: ${titleId}) from user ${userId}`);
              return { removed: true, title_id: titleId };
          } else {
              console.log(`Title ${titleKey} (ID: ${titleId}) was not found for user ${userId} to remove.`);
              return { removed: false, not_found: true, title_id: titleId };
          }
      } catch (err) {
          if (client) {
              await client.query('ROLLBACK');
          }
          console.error(`Error removing title ${titleKey} from user ${userId}:`, err);
          return { removed: false, error: err.message || 'Database error during title removal' };
      } finally {
          if (client) {
              client.release();
          }
      }
  },

  // Check user stats against NON-EXCLUSIVE title criteria and award any earned titles
  // Exclusive titles (Eisgruber, Fastest, Slowest) are handled by updateExclusiveTitles
  async checkAndAwardTitles(userId) {
    let user;
    let detailedStats;
    try {
      // Get user's current stats and detailed stats in parallel
       [user, detailedStats] = await Promise.all([
           this.findById(userId),
           this.getDetailedStats(userId)
       ]);

      if (!user) {
          console.warn(`User not found (ID: ${userId}) in checkAndAwardTitles.`);
          return [];
      }
      if (!detailedStats) {
          console.warn(`Detailed stats not found for user ${userId} in checkAndAwardTitles.`);
          // Decide if we can proceed without detailed stats or return early
          detailedStats = { sessions_completed: 0, sessions_started: 0, words_typed: 0}; // Provide defaults?
      }


      // Get all NON-EXCLUSIVE titles the user doesn't already have
      const availableTitles = await pool.query(`
        SELECT t.id, t.key, t.name, t.description, t.criteria_type, t.criteria_value
        FROM titles t
        WHERE t.key NOT IN ('president_eisgruber', 'princetons_fastest_typer', 'princetons_slowest_typer') -- Exclude exclusive titles
          AND NOT EXISTS (
            SELECT 1 FROM user_titles ut
            WHERE ut.title_id = t.id AND ut.user_id = $1
          )
      `, [userId]);

      console.log(`Checking ${availableTitles.rows.length} available non-exclusive titles for user: ${userId}`);

      const newlyAwardedTitles = [];

      // Check each title criteria
      for (const title of availableTitles.rows) {
        let awardTitle = false;
        const criteriaValue = parseFloat(title.criteria_value); // Ensure numeric comparison

        try { // Wrap individual title checks in try/catch
            switch (title.criteria_type) {
              case 'sessions_completed': // Needs A Shower
                if (detailedStats.sessions_completed >= criteriaValue) {
                  awardTitle = true;
                }
                break;
              case 'completion_rate_low': // Commitment Issues
                if (detailedStats.sessions_started > 0) { // Avoid division by zero
                  const completionRate = (detailedStats.sessions_completed / detailedStats.sessions_started) * 100;
                  
                  console.log(`User ${userId} completion rate: ${completionRate.toFixed(2)}% (${detailedStats.sessions_completed}/${detailedStats.sessions_started} sessions completed)`);
          
                  // Award if rate is LESS than the criteria value (e.g., < 5%)
                  if (completionRate < criteriaValue) {
                    console.log(`User ${userId} qualifies for Commitment Issues title with completion rate ${completionRate.toFixed(2)}%`);
                    awardTitle = true;
                  }
                }
                break;
               case 'words_typed': // SPIA Major
                 if (detailedStats.words_typed >= criteriaValue) {
                   awardTitle = true;
                 }
                 break;
              case 'avg_wpm': // Orange Lightning (example of other non-exclusive)
                if (user.avg_wpm !== null && parseFloat(user.avg_wpm) >= criteriaValue) {
                  awardTitle = true;
                }
                break;
              case 'snippet_completed': // Wawa Warrior
                {
                  const res = await pool.query(
                    'SELECT 1 FROM race_results WHERE user_id = $1 AND snippet_id = $2 LIMIT 1',
                    [userId, title.criteria_value] // criteria_value is snippet_id here
                  );
                  if (res.rowCount > 0) {
                    awardTitle = true;
                  }
                }
                break;
              case 'beta_tester': // Beta Tester
                {
                   // Criteria value stored as YYYYMMDD integer. Convert to date.
                   const dateStr = String(title.criteria_value);
                   const year = parseInt(dateStr.substring(0, 4));
                   const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
                   const day = parseInt(dateStr.substring(6, 8));
                   const cutoff = new Date(Date.UTC(year, month, day, 0, 0, 0)); // Use UTC

                  const res = await pool.query(
                    'SELECT 1 FROM race_results WHERE user_id = $1 AND created_at < $2 LIMIT 1',
                    [userId, cutoff]
                  );
                   if (res.rowCount > 0) {
                    awardTitle = true;
                   }
                }
                break;
                // Add other non-exclusive criteria checks here if any exist
            } // end switch

            if (awardTitle) {
              const result = await this.awardTitle(userId, title.key);
              if (result.awarded) {
                newlyAwardedTitles.push(result.title);
              } else if (result.error) {
                  console.error(`Failed to award title ${title.key} to user ${userId}: ${result.error}`);
              }
            }
        } catch (titleCheckError) {
             console.error(`Error checking title ${title.key} for user ${userId}:`, titleCheckError);
             // Continue to the next title
        }
      } // end for loop

      return newlyAwardedTitles;
    } catch (err) {
      console.error(`Error checking and awarding non-exclusive titles for user ${userId}:`, err);
      return []; // Return empty array on error
    }
  },

  // Update exclusive titles based on global leaderboards/stats
  async updateExclusiveTitles(triggeredByUserId = null) {
      console.log(`Updating exclusive titles (triggered by user: ${triggeredByUserId || 'system'})`);
      let client;
      try {
          client = await pool.connect();
          await client.query('BEGIN');

          // --- Helper to handle awarding/removing an exclusive title ---
          const manageExclusiveTitle = async (titleKey, newHolderUserId) => {
              console.log(`Managing exclusive title: ${titleKey}. New holder target: ${newHolderUserId}`);
              // 1. Find the title ID
              const titleResult = await client.query('SELECT id FROM titles WHERE key = $1', [titleKey]);
              if (titleResult.rows.length === 0) {
                  console.error(`Exclusive title key ${titleKey} not found in database.`);
                  return; // Skip if title doesn't exist
              }
              const titleId = titleResult.rows[0].id;

              // 2. Find the current holder(s) of this title
              const currentHoldersResult = await client.query(
                  'SELECT user_id FROM user_titles WHERE title_id = $1',
                  [titleId]
              );
              const currentHolderIds = currentHoldersResult.rows.map(row => row.user_id);
              console.log(`Current holders for ${titleKey}: ${currentHolderIds.join(', ')}`);

              // 3. Determine who should lose the title
              const usersToRemove = currentHolderIds.filter(id => id !== newHolderUserId);

              // 4. Remove the title from previous holders
              if (usersToRemove.length > 0) {
                  console.log(`Removing ${titleKey} from users: ${usersToRemove.join(', ')}`);
                  // Unequip if selected
                  await client.query(
                      'UPDATE users SET selected_title_id = NULL WHERE id = ANY($1::int[]) AND selected_title_id = $2',
                      [usersToRemove, titleId]
                  );
                  // Delete from user_titles
                  await client.query(
                      'DELETE FROM user_titles WHERE title_id = $1 AND user_id = ANY($2::int[])',
                      [titleId, usersToRemove]
                  );
              }

              // 5. Award the title to the new holder (if they don't have it already)
              if (newHolderUserId && !currentHolderIds.includes(newHolderUserId)) {
                  console.log(`Awarding ${titleKey} to user: ${newHolderUserId}`);
                  await client.query(
                      'INSERT INTO user_titles (user_id, title_id, awarded_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (user_id, title_id) DO NOTHING',
                      [newHolderUserId, titleId]
                  );
                  // Optionally, auto-equip the title for the new holder?
                  // await client.query('UPDATE users SET selected_title_id = $1 WHERE id = $2', [titleId, newHolderUserId]);
              } else if (newHolderUserId) {
                   console.log(`User ${newHolderUserId} already holds ${titleKey}. No award action needed.`);
              } else if (currentHolderIds.length > 0 && usersToRemove.length === currentHolderIds.length) {
                  // Case where there was a holder, but now there should be none (e.g., no one meets criteria)
                   console.log(`No new holder for ${titleKey}, title remains unassigned.`);
              }
          }; // --- End helper ---


          // --- 1. President Eisgruber (Fastest 15s All-Time Adjusted WPM) ---
          let eisgruberHolderId = null;
          try {
              const leaderboard15s = await getTimedLeaderboard(15, 'alltime', 1); // Use the existing DB function
              if (leaderboard15s && leaderboard15s.length > 0) {
                  // Ensure the top score has positive adjusted WPM
                  if (leaderboard15s[0].adjusted_wpm > 0) {
                     eisgruberHolderId = leaderboard15s[0].user_id;
                     console.log(`Top 15s All-Time user: ${eisgruberHolderId} (Adj WPM: ${leaderboard15s[0].adjusted_wpm})`);
                  } else {
                      console.log('Top 15s score is not positive, not awarding Eisgruber title.');
                  }
              } else {
                   console.log('No results found for 15s all-time leaderboard.');
              }
              await manageExclusiveTitle('president_eisgruber', eisgruberHolderId);
          } catch (eisError) {
               console.error("Error processing 'President Eisgruber' title:", eisError);
               // Decide if we should rollback or continue with others
          }


          // --- 2. Princeton's Fastest Typer (Highest Avg WPM overall) ---
          let fastestAvgWpmHolderId = null;
          try {
              // Query for user with highest avg_wpm (must have completed at least 1 session)
               const fastestAvgResult = await client.query(`
                  SELECT id
                  FROM users
                  WHERE avg_wpm IS NOT NULL AND (races_completed > 0 OR id IN (SELECT DISTINCT user_id FROM timed_leaderboard)) -- Ensure they've completed something contributing to avg
                  ORDER BY avg_wpm DESC, last_login DESC -- Tie-break by recent activity
                  LIMIT 1
              `);
              if (fastestAvgResult.rows.length > 0) {
                  fastestAvgWpmHolderId = fastestAvgResult.rows[0].id;
                  console.log(`Highest Avg WPM user: ${fastestAvgWpmHolderId}`);
              } else {
                  console.log('No eligible user found for Highest Avg WPM title.');
              }
              await manageExclusiveTitle('princetons_fastest_typer', fastestAvgWpmHolderId);
          } catch (fastestAvgError) {
              console.error("Error processing 'Princeton's Fastest Typer' title:", fastestAvgError);
          }


          // --- 3. Princeton's Slowest Typer (Lowest Avg WPM, min 10 sessions completed) ---
          let slowestAvgWpmHolderId = null;
          try {
              // Query for user with lowest non-zero avg_wpm, requiring >= 10 completed sessions
               const slowestAvgResult = await client.query(`
                  SELECT u.id
                  FROM users u
                  WHERE u.avg_wpm > 0 -- Exclude 0 WPM averages
                  AND EXISTS ( -- Check for at least 10 completed sessions (races + timed)
                     SELECT 1
                     FROM (
                       SELECT user_id, COUNT(*) as total_completed
                       FROM (
                         SELECT user_id FROM race_results
                         UNION ALL
                         SELECT user_id FROM timed_leaderboard
                       ) AS completed_sessions
                       WHERE user_id = u.id
                       GROUP BY user_id
                       HAVING COUNT(*) >= 10
                     ) AS session_counts
                  )
                  ORDER BY u.avg_wpm ASC, u.last_login DESC -- Tie-break by recent activity
                  LIMIT 1
              `);
              if (slowestAvgResult.rows.length > 0) {
                  slowestAvgWpmHolderId = slowestAvgResult.rows[0].id;
                  console.log(`Lowest Avg WPM user (>=10 sessions): ${slowestAvgWpmHolderId}`);
              } else {
                   console.log('No eligible user found for Lowest Avg WPM title (min 10 sessions).');
              }
              await manageExclusiveTitle('princetons_slowest_typer', slowestAvgWpmHolderId);
           } catch (slowestAvgError) {
               console.error("Error processing 'Princeton's Slowest Typer' title:", slowestAvgError);
           }


          // --- 4. Record Holder (Highest Fastest WPM overall) ---
          let fastestWpmHolderId = null;
          try {
              // Query for user with highest fastest_wpm (must be > 0)
              const fastestResult = await client.query(`
                  SELECT id
                  FROM users
                  WHERE fastest_wpm IS NOT NULL AND fastest_wpm > 0
                  ORDER BY fastest_wpm DESC, last_login DESC -- Tie-break by recent activity
                  LIMIT 1
              `);
              if (fastestResult.rows.length > 0) {
                  fastestWpmHolderId = fastestResult.rows[0].id;
                  console.log(`Highest Fastest WPM user: ${fastestWpmHolderId}`);
              } else {
                  console.log('No eligible user found for Record Holder title.');
              }
              await manageExclusiveTitle('record_holder', fastestWpmHolderId);
          } catch (fastestWpmError) {
              console.error("Error processing 'Record Holder' title:", fastestWpmError);
          }


          // --- Commit Transaction ---
          await client.query('COMMIT');
          console.log("Finished updating exclusive titles.");

      } catch (err) {
          if (client) {
              await client.query('ROLLBACK'); // Rollback on any major error
          }
          console.error('Critical error during updateExclusiveTitles transaction:', err);
          // Potentially re-throw or handle more gracefully
      } finally {
          if (client) {
              client.release(); // Ensure client is always released
          }
      }
  },

  // Helper function to force-check all titles for a user, including commitment issues
  async forceCheckAllTitles(userId) {
    console.log(`Force checking all titles for user ${userId}`);
    try {
      // Get detailed stats
      const detailedStats = await this.getDetailedStats(userId);
      if (!detailedStats) {
        console.warn(`No detailed stats found for user ${userId}`);
        return [];
      }
      
      console.log(`User ${userId} stats:`, JSON.stringify(detailedStats));
      
      // Calculate completion rate manually
      const totalSessions = detailedStats.sessions_completed + detailedStats.partial_sessions;
      if (totalSessions > 0) {
        const completionRate = (detailedStats.sessions_completed / totalSessions) * 100;
        console.log(`User ${userId} has completion rate: ${completionRate.toFixed(2)}% (${detailedStats.sessions_completed}/${totalSessions})`);
        
        // Check specifically for Commitment Issues title
        if (completionRate < 5 && totalSessions >= 10) { // At least 10 sessions for statistical significance
          console.log(`User ${userId} qualifies for Commitment Issues with ${completionRate.toFixed(2)}% completion rate`);
          
          // Get the title ID for commitment_issues
          const titleResult = await pool.query('SELECT id FROM titles WHERE key = $1', ['commitment_issues']);
          if (titleResult.rows.length > 0) {
            const titleId = titleResult.rows[0].id;
            
            // Check if user already has this title
            const existingTitle = await pool.query(
              'SELECT 1 FROM user_titles WHERE user_id = $1 AND title_id = $2',
              [userId, titleId]
            );
            
            if (existingTitle.rows.length === 0) {
              // Award the title if not already awarded
              await pool.query(
                'INSERT INTO user_titles (user_id, title_id) VALUES ($1, $2)',
                [userId, titleId]
              );
              console.log(`Awarded Commitment Issues title to user ${userId}`);
            } else {
              console.log(`User ${userId} already has Commitment Issues title`);
            }
          }
        }
      }
      
      // Also check other titles
      await this.checkAndAwardTitles(userId);
      await this.updateExclusiveTitles(userId);
      
      return await this.getTitles(userId); // Return the updated list of titles
    } catch (error) {
      console.error(`Error in forceCheckAllTitles for user ${userId}:`, error);
      return [];
    }
  },

};

// Debug check to verify functions exist
// console.log('User model has methods:', Object.keys(User));
// console.log('updateBio exists:', typeof User.updateBio === 'function');
// console.log('updateAvatarUrl exists:', typeof User.updateAvatarUrl === 'function');

module.exports = User;
