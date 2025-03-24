/**
 * Socket.IO event handlers for TigerType
 */

const SnippetModel = require('../models/snippet');
const RaceModel = require('../models/race');
const UserModel = require('../models/user');
const analytics = require('../utils/analytics');

// Store active races in memory
const activeRaces = new Map();
// Store players in each race
const racePlayers = new Map();
// Store player progress
const playerProgress = new Map();

// Throttle progress updates to avoid spamming
const PROGRESS_THROTTLE = 100; // ms
const lastProgressUpdate = new Map();

// Initialize socket handlers with IO instance
const initialize = (io) => {
  io.on('connection', (socket) => {
    // Store user info from session middleware
    const { netid, userId } = socket.request.session.userInfo || {};
    
    // If no netid, reject connection
    if (!netid) {
      socket.disconnect(true);
      return;
    }
    
    console.log(`Socket connected: ${netid} (${socket.id})`);
    
    // Emit welcome event with user info
    socket.emit('connected', {
      id: socket.id,
      netid
    });
    
    // Handle joining practice mode
    socket.on('practice:join', async () => {
      try {
        // Get a random snippet
        const snippet = await SnippetModel.getRandom();
        
        if (!snippet) {
          socket.emit('error', { message: 'Failed to load snippet' });
          return;
        }
        
        // Create a practice lobby
        const lobby = await RaceModel.create('practice', snippet.id);
        
        // Join the socket room
        socket.join(lobby.code);
        
        // Add player to race
        racePlayers.set(lobby.code, [{
          id: socket.id,
          netid,
          userId,
          ready: true
        }]);
        
        // Active race info
        activeRaces.set(lobby.code, {
          id: lobby.id,
          code: lobby.code,
          snippet: {
            id: snippet.id,
            text: snippet.text
          },
          status: 'waiting',
          type: 'practice',
          startTime: null
        });
        
        // Send race info to player
        socket.emit('race:joined', {
          code: lobby.code,
          type: 'practice',
          snippet: {
            id: snippet.id,
            text: snippet.text
          }
        });
        
        // Start race countdown immediately for practice mode
        startCountdown(io, lobby.code);
      } catch (err) {
        console.error('Error joining practice:', err);
        socket.emit('error', { message: 'Failed to join practice mode' });
      }
    });
    
    // Handle joining public lobby
    socket.on('public:join', async () => {
      try {
        // Check if player is already in a race
        for (const [code, players] of racePlayers.entries()) {
          if (players.some(p => p.id === socket.id)) {
            socket.emit('error', { message: 'Already in a race' });
            return;
          }
        }
        
        // Try to find an existing public lobby
        let lobby = await RaceModel.findPublicLobby();
        
        // If no lobby exists, create a new one with a random snippet
        if (!lobby) {
          const snippet = await SnippetModel.getRandom();
          lobby = await RaceModel.create('public', snippet.id);
          
          // Initialize active race
          activeRaces.set(lobby.code, {
            id: lobby.id,
            code: lobby.code,
            snippet: {
              id: snippet.id,
              text: snippet.text
            },
            status: 'waiting',
            type: 'public',
            startTime: null
          });
          
          // Initialize player list
          racePlayers.set(lobby.code, []);
        }
        
        // Join the socket room
        socket.join(lobby.code);
        
        // Add player to race
        const players = racePlayers.get(lobby.code) || [];
        players.push({
          id: socket.id,
          netid,
          userId,
          ready: false
        });
        racePlayers.set(lobby.code, players);
        
        // Send race info to player
        socket.emit('race:joined', {
          code: lobby.code,
          type: 'public',
          snippet: {
            id: activeRaces.get(lobby.code).snippet.id,
            text: activeRaces.get(lobby.code).snippet.text
          },
          players: players.map(p => ({ netid: p.netid, ready: p.ready }))
        });
        
        // Broadcast updated player list to all in the lobby
        io.to(lobby.code).emit('race:playersUpdate', {
          players: players.map(p => ({ netid: p.netid, ready: p.ready }))
        });
        
        // If all players are ready (2+), start countdown
        checkAndStartCountdown(io, lobby.code);
      } catch (err) {
        console.error('Error joining public lobby:', err);
        socket.emit('error', { message: 'Failed to join public lobby' });
      }
    });
    
    // Handle player ready status
    socket.on('player:ready', () => {
      try {
        // Find the race this player is in
        for (const [code, players] of racePlayers.entries()) {
          const playerIndex = players.findIndex(p => p.id === socket.id);
          
          if (playerIndex !== -1) {
            // Mark player as ready
            players[playerIndex].ready = true;
            racePlayers.set(code, players);
            
            // Broadcast updated player list
            io.to(code).emit('race:playersUpdate', {
              players: players.map(p => ({ netid: p.netid, ready: p.ready }))
            });
            
            // If all players are ready (2+), start countdown
            checkAndStartCountdown(io, code);
            break;
          }
        }
      } catch (err) {
        console.error('Error setting player ready:', err);
      }
    });
    
    // Handle progress updates
    socket.on('race:progress', (data) => {
      try {
        const { code, position, completed } = data;
        
        // Check if race exists and is active
        const race = activeRaces.get(code);
        if (!race || race.status !== 'racing') {
          return;
        }
        
        // Find player in the race
        const players = racePlayers.get(code);
        const playerIndex = players.findIndex(p => p.id === socket.id);
        
        if (playerIndex === -1) {
          return;
        }
        
        // Throttle progress updates
        const now = Date.now();
        const lastUpdate = lastProgressUpdate.get(socket.id) || 0;
        
        if (now - lastUpdate < PROGRESS_THROTTLE && !completed) {
          return;
        }
        
        lastProgressUpdate.set(socket.id, now);
        
        // Validate the progress if needed
        // This is a simplified version - more validation could be added
        
        // Store player progress
        playerProgress.set(socket.id, {
          position,
          completed,
          timestamp: now
        });
        
        // Calculate completion percentage 
        const percentage = Math.floor((position / race.snippet.text.length) * 100);
        
        // Broadcast progress to all players in the race
        io.to(code).emit('race:playerProgress', {
          netid,
          position,
          percentage,
          completed
        });
        
        // Handle race completion for this player
        if (completed) {
          handlePlayerFinish(io, code, socket.id);
        }
      } catch (err) {
        console.error('Error updating progress:', err);
      }
    });
    
    // Handle race result
    socket.on('race:result', async (data) => {
      try {
        const { code, wpm, accuracy } = data;
        
        // Check if race exists
        const race = activeRaces.get(code);
        if (!race) {
          return;
        }
        
        // Get player info
        const players = racePlayers.get(code);
        const player = players.find(p => p.id === socket.id);
        
        if (!player) {
          return;
        }
        
        // Get player progress
        const progress = playerProgress.get(socket.id);
        
        if (!progress || !progress.completed) {
          return;
        }
        
        // Calculate completion time
        const completionTime = (progress.timestamp - race.startTime) / 1000;
        
        // Record race result in database
        await RaceModel.recordResult(
          player.userId,
          race.id,
          race.snippet.id,
          wpm,
          accuracy,
          completionTime
        );
        
        // Broadcast result to all players
        io.to(code).emit('race:playerResult', {
          netid: player.netid,
          wpm,
          accuracy,
          completionTime
        });
      } catch (err) {
        console.error('Error recording race result:', err);
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${netid} (${socket.id})`);
      
      // Remove player from all races
      for (const [code, players] of racePlayers.entries()) {
        const playerIndex = players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
          // Remove player from race
          players.splice(playerIndex, 1);
          
          // If no players left, clean up race
          if (players.length === 0) {
            racePlayers.delete(code);
            activeRaces.delete(code);
            continue;
          }
          
          // Update player list
          racePlayers.set(code, players);
          
          // Broadcast updated player list
          io.to(code).emit('race:playersUpdate', {
            players: players.map(p => ({ netid: p.netid, ready: p.ready }))
          });
          
          // Broadcast player left message
          io.to(code).emit('race:playerLeft', { netid });
        }
      }
      
      // Clean up any stored progress
      playerProgress.delete(socket.id);
      lastProgressUpdate.delete(socket.id);
    });
  });
};

// Check if all players are ready and start countdown if appropriate
const checkAndStartCountdown = (io, code) => {
  const players = racePlayers.get(code);
  
  // Need at least 2 players for public races
  if (!players || players.length < 2) {
    return;
  }
  
  // Check if all players are ready
  const allReady = players.every(p => p.ready);
  
  if (allReady) {
    startCountdown(io, code);
  }
};

// Start the countdown for a race
const startCountdown = async (io, code) => {
  try {
    const race = activeRaces.get(code);
    
    if (!race || race.status !== 'waiting') {
      return;
    }
    
    // Update race status to countdown
    race.status = 'countdown';
    activeRaces.set(code, race);
    
    // Update database status
    await RaceModel.updateStatus(race.id, 'countdown');
    
    // Broadcast countdown start
    io.to(code).emit('race:countdown', { seconds: 5 });
    
    // Wait 5 seconds and start the race
    setTimeout(() => startRace(io, code), 5000);
  } catch (err) {
    console.error('Error starting countdown:', err);
  }
};

// Start a race
const startRace = async (io, code) => {
  try {
    const race = activeRaces.get(code);
    
    if (!race || race.status !== 'countdown') {
      return;
    }
    
    // Update race status to racing
    race.status = 'racing';
    race.startTime = Date.now();
    activeRaces.set(code, race);
    
    // Update database status
    await RaceModel.updateStatus(race.id, 'racing');
    
    // Broadcast race start
    io.to(code).emit('race:start', { startTime: race.startTime });
  } catch (err) {
    console.error('Error starting race:', err);
  }
};

// Handle player finishing a race
const handlePlayerFinish = async (io, code, playerId) => {
  try {
    const race = activeRaces.get(code);
    
    if (!race || race.status !== 'racing') {
      return;
    }
    
    const players = racePlayers.get(code);
    const player = players.find(p => p.id === playerId);
    
    if (!player) {
      return;
    }
    
    // Check if all players have finished
    const allCompleted = players.every(p => {
      const progress = playerProgress.get(p.id);
      return progress && progress.completed;
    });
    
    // If all players are done, end the race
    if (allCompleted) {
      await endRace(io, code);
    }
  } catch (err) {
    console.error('Error handling player finish:', err);
  }
};

// End a race and show results
const endRace = async (io, code) => {
  try {
    const race = activeRaces.get(code);
    
    if (!race || race.status !== 'racing') {
      return;
    }
    
    // Update race status
    race.status = 'finished';
    activeRaces.set(code, race);
    
    // Update database
    await RaceModel.updateStatus(race.id, 'finished');
    
    // Get race results
    const results = await RaceModel.getResults(race.id);
    
    // Broadcast race end
    io.to(code).emit('race:end', { results });
  } catch (err) {
    console.error('Error ending race:', err);
  }
};

module.exports = {
  initialize
};