const db = require('../config/database');
const crypto = require('crypto');
const SERIALIZABLE = 'SERIALIZABLE';   // isolation level constant


// Race/Lobby model for managing race sessions
const Race = {
  // Generate a unique lobby code
  generateCode(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  },

  // Create a new race lobby with retry logic for code collisions
  async create(type, snippetId, hostId = null, maxRetries = 5) { 
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const code = this.generateCode();
        let query;
        let params;

        // Base columns and values
        const columns = ['code', 'type', 'status'];
        const values = [code, type, 'waiting'];
        let valuePlaceholders = ['$1', '$2', '$3'];

        // Add snippet_id if provided (not null/undefined)
        if (snippetId != null) {
          columns.push('snippet_id');
          values.push(snippetId);
          valuePlaceholders.push(`$${values.length}`);
        }

        // Add host_id if type is 'private' and hostId is provided
        if (type === 'private' && hostId != null) {
          columns.push('host_id');
          values.push(hostId);
          valuePlaceholders.push(`$${values.length}`);
        }
        
        // Construct the query dynamically
        query = `
          INSERT INTO lobbies (${columns.join(', ')})
          VALUES (${valuePlaceholders.join(', ')})
          RETURNING *
        `;
        params = values;
        
        const result = await db.query(query, params);
        // If insert succeeds, return the result
        return result.rows[0]; 
      } catch (err) {
        // Check if the error is a unique constraint violation (PostgreSQL code 23505)
        if (err.code === '23505' && err.constraint === 'lobbies_code_key') {
          retries++;
          console.warn(`Lobby code collision detected (attempt ${retries}/${maxRetries}). Retrying...`);
          if (retries >= maxRetries) {
            console.error('Max retries reached for lobby code generation.');
            throw new Error('Failed to generate a unique lobby code after multiple attempts.');
          }
          // Wait a very short time before retrying to avoid tight loops
          await new Promise(resolve => setTimeout(resolve, 50)); 
        } else {
          // If it's a different error, re-throw it immediately
          console.error('Error creating race lobby:', err);
          throw err;
        }
      }
    }
    // This part should technically be unreachable if maxRetries > 0
    throw new Error('Failed to create lobby after multiple retries.'); 
  },

  // Find a race lobby by code, including host netid
  async findByCode(code) {
    try {
      const result = await db.query(
        `SELECT l.*, s.text AS snippet_text, h.netid AS host_netid
         FROM lobbies l
         LEFT JOIN snippets s ON l.snippet_id = s.id -- Use LEFT JOIN in case snippet is null (e.g., timed practice)
         LEFT JOIN users h ON l.host_id = h.id      -- LEFT JOIN to get host netid if available
         WHERE l.code = $1`,
        [code]
      );
      
      return result.rows[0];
    } catch (err) {
      console.error('Error finding race by code:', err);
      throw err;
    }
  },
  
  // Find an active private lobby by host's NetID
  async findByHostNetId(netId) {
    try {
      console.log(`[findByHostNetId] Searching for lobby with host NetID: '${netId}'`);
      
      const result = await db.query(
        `SELECT l.*, s.text AS snippet_text, h.netid AS host_netid
         FROM lobbies l
         JOIN users h ON l.host_id = h.id
         LEFT JOIN snippets s ON l.snippet_id = s.id
         WHERE LOWER(h.netid) = LOWER($1) AND l.type = 'private' AND l.status = 'waiting'
         ORDER BY l.created_at DESC -- Get the most recent one if multiple exist
         LIMIT 1`,
        [netId]
      );
      
      console.log(`[findByHostNetId] Query result for host NetID '${netId}':`, result.rows[0] || 'Not Found');
      
      return result.rows[0];
    } catch (err) {
      console.error('Error finding lobby by host NetID:', err);
      throw err;
    }
  },

  // Find an active private lobby (waiting) that contains a particular player's netid
  async findByPlayerNetId(netId) {
    try {
      const result = await db.query(
        `SELECT l.*, s.text AS snippet_text, h.netid AS host_netid
         FROM lobbies l
         JOIN lobby_players lp ON lp.lobby_id = l.id
         JOIN users u ON lp.user_id = u.id
         LEFT JOIN snippets s ON l.snippet_id = s.id
         LEFT JOIN users h ON l.host_id = h.id
         WHERE LOWER(u.netid) = LOWER($1) AND l.type = 'private' AND l.status = 'waiting'
         ORDER BY l.created_at DESC
         LIMIT 1`,
        [netId]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Error finding lobby by player NetID:', err);
      throw err;
    }
  },

  // Find a public lobby with 'waiting' status
  async findPublicLobby() {
    try {
      const result = await db.query(
        `SELECT l.*, s.text AS snippet_text, h.netid AS host_netid
         FROM lobbies l
         LEFT JOIN snippets s ON l.snippet_id = s.id
         LEFT JOIN users h ON l.host_id = h.id -- Include host netid if applicable (though usually null for public)
         WHERE l.type = 'public' AND l.status = 'waiting'
         ORDER BY l.created_at ASC
         LIMIT 1`
      );
      
      return result.rows[0];
    } catch (err) {
      console.error('Error finding public lobby:', err);
      throw err;
    }
  },
  
  // Get lobby details including host information
  async getLobbyWithHost(lobbyId) {
    try {
      const result = await db.query(
        `SELECT l.*, s.text AS snippet_text, h.netid AS host_netid
         FROM lobbies l
         LEFT JOIN snippets s ON l.snippet_id = s.id
         LEFT JOIN users h ON l.host_id = h.id
         WHERE l.id = $1`,
        [lobbyId]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Error getting lobby with host:', err);
      throw err;
    }
  },

  // Update race lobby status
  async updateStatus(lobbyId, status) {
    try {
      const updates = { status };
      
      // Add timestamps based on status
      if (status === 'racing') {
        updates.started_at = 'CURRENT_TIMESTAMP';
      } else if (status === 'finished') {
        updates.finished_at = 'CURRENT_TIMESTAMP';
      }
      
      // Build the SET clause dynamically
      const setClause = Object.entries(updates)
        .map(([key, value], index) => {
          return `${key} = ${value === 'CURRENT_TIMESTAMP' ? 'CURRENT_TIMESTAMP' : `$${index + 1}`}`;
        })
        .join(', ');
      
      // Filter out timestamp literals from params
      const params = Object.values(updates)
        .filter(value => value !== 'CURRENT_TIMESTAMP')
        .concat([lobbyId]);
      
      const query = `
        UPDATE lobbies
        SET ${setClause}
        WHERE id = $${params.length}
        RETURNING *
      `;
      
      const result = await db.query(query, params);
      return result.rows[0];
    } catch (err) {
      console.error('Error updating race status:', err);
      throw err;
    }
  },

  // Record a race result
  async recordResult(userId, lobbyId, snippetId, wpm, accuracy, completionTime) {
    try {
      const dbHelpers = require('../utils/db-helpers');
      
      // Use the helper to record result and update user stats in a single transaction
      return await dbHelpers.recordRaceResult({
        userId,
        lobbyId,
        snippetId,
        wpm,
        accuracy,
        completionTime
      });
    } catch (err) {
      console.error('Error recording race result:', err);
      throw err;
    }
  },

  // Get results for a specific race
  async getResults(lobbyId) {
    try {
      const result = await db.query(
        `SELECT r.*, u.netid, u.avatar_url
         FROM race_results r
         JOIN users u ON r.user_id = u.id
         WHERE r.lobby_id = $1
         ORDER BY r.wpm DESC`,
        [lobbyId]
      );
      
      return result.rows;
    } catch (err) {
      console.error('Error getting race results:', err);
      throw err;
    }
  },
  
  // Update lobby settings (e.g., snippet_id, duration - if added later)
  async updateSettings(lobbyId, settings) {
    try {
      const allowedFields = ['snippet_id']; // Add other configurable fields here if needed
      const updates = {};
      const params = [];
      let paramIndex = 1;

      // Build SET clause and params array safely
      const setClause = allowedFields
        .filter(field => settings.hasOwnProperty(field))
        .map(field => {
          updates[field] = settings[field];
          params.push(settings[field]);
          return `${field} = $${paramIndex++}`;
        })
        .join(', ');

      if (params.length === 0) {
        console.warn('No valid settings provided for update.');
        // Optionally fetch and return the current lobby state
        return await this.getLobbyWithHost(lobbyId); 
      }

      params.push(lobbyId); // Add lobbyId as the last parameter for WHERE clause

      const query = `
        UPDATE lobbies
        SET ${setClause}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(query, params);
      // Return the updated lobby, potentially fetching with host info again
      return await this.getLobbyWithHost(result.rows[0].id); 
    } catch (err) {
      console.error('Error updating lobby settings:', err);
      throw err;
    }
  },

  // Add a player to a lobby
  // - Private lobbies: enforce 10-player cap
  // - Public lobbies: no cap
  async addPlayerToLobby(lobbyId, userId, isReady = false) {
    const client = await db.getClient(); // Use a client for transaction
    try { // Start try block immediately after acquisition
      await client.query('BEGIN');

      // Determine lobby type for capacity rules
      const lobbyTypeRes = await client.query(
        `SELECT type FROM lobbies WHERE id = $1`,
        [lobbyId]
      );
      if (lobbyTypeRes.rowCount === 0) {
        await client.query('ROLLBACK');
        throw new Error('Lobby not found.');
      }
      const lobbyType = lobbyTypeRes.rows[0].type;

      // Check current player count
      const countResult = await client.query(
        `SELECT COUNT(*) FROM lobby_players WHERE lobby_id = $1`,
        [lobbyId]
      );
      const playerCount = parseInt(countResult.rows[0].count, 10);

      // Enforce capacity only for PRIVATE lobbies (max 10 players)
      if (lobbyType === 'private' && playerCount >= 10) {
        // Rollback before throwing ensures transaction state is clean
        await client.query('ROLLBACK');
        throw new Error('Lobby is full.'); // Throw specific error
      }

      // If not full, insert or update the player
      const result = await client.query(
        `INSERT INTO lobby_players (lobby_id, user_id, is_ready, join_time)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (lobby_id, user_id)
         DO UPDATE SET is_ready = $3, join_time = CURRENT_TIMESTAMP
         RETURNING *`,
        [lobbyId, userId, isReady]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      // Attempt rollback if an error occurred (might fail if already rolled back)
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Error during rollback attempt:', rollbackErr);
      }
      console.error('Error adding player to lobby:', err);
      // Re-throw the original error after attempting rollback
      throw err;
    } finally {
      // ALWAYS RELEASE CLIENT
      if (client) { // Check if client was successfully acquired
          client.release();
          console.debug('Client released in addPlayerToLobby');
      }
    }
  },
  
  // Update player ready stauts
  async updatePlayerReadyStatus(lobbyId, userId, isReady) {
    try {
      const result = await db.query(
        `UPDATE lobby_players 
         SET is_ready = $3 
         WHERE lobby_id = $1 AND user_id = $2
         RETURNING *`,
        [lobbyId, userId, isReady]
      );
      
      return result.rows[0];
    } catch (err) {
      console.error('Error updating player ready status:', err);
      throw err;
    }
  },

  /* ------------------------------------------------------------------ *
   *  softTerminate(lobbyId, reason='terminated')
   *      • sets status = 'finished'
   *      • sets finished_at = now()
   * ------------------------------------------------------------------ */
   async softTerminate (lobbyId) {
      await db.query(
        `UPDATE lobbies
            SET status      = 'finished',
                finished_at = CURRENT_TIMESTAMP,
                version     = version + 1
          WHERE id = $1`,
        [lobbyId],
      );
    },

  /* ------------------------------------------------------------------ *
   *  incrementVersion – optimistic‑concurrency helper
   * ------------------------------------------------------------------ */
  async incrementVersion (lobbyId) {
    await db.query(
      `UPDATE lobbies
          SET version = version + 1
        WHERE id = $1`,
      [lobbyId],
    );
  },

    /* ------------------------------------------------------------------ *
   *  reassignHost(lobbyId, newHostUserId)  →  updated lobby row
   * ------------------------------------------------------------------ */
    async reassignHost (lobbyId, newHostUserId) {
      return this.atomic(async (c) => {
        const { rows } = await c.query(
          `UPDATE lobbies
             SET host_id = $2, version = version + 1
           WHERE id = $1
           RETURNING *`,
          [lobbyId, newHostUserId],
        );
        return rows[0];
      });
    },

    async atomic (fn) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const client = await db.getClient();
        try {
          await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE;');
          const res = await fn(client);
          await client.query('COMMIT;');
          return res;
        } catch (e) {
          await client.query('ROLLBACK;');
          if (e.code === '40001' && attempt < 2) continue;          // serialization failure → retry
          throw e;
        } finally {
          client.release();
        }
      }
    },
  
  // Remove a player from a lobby
  async removePlayerFromLobby(lobbyId, userId) {
    try {
      const result = await db.query(
        `DELETE FROM lobby_players 
         WHERE lobby_id = $1 AND user_id = $2
         RETURNING *`,
        [lobbyId, userId]
      );
      
      return result.rows[0];
    } catch (err) {
      console.error('Error removing player from lobby:', err);
      throw err;
    }
  }
};

module.exports = Race;
