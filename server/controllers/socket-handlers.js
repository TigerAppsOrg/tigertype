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
    const socketInfo = socket.userInfo || socket.request.session?.userInfo || {};
    const netid = socketInfo.user || socketInfo.netid || 'guest-user';
    const userId = socketInfo.userId || 999;
    
    // Debug info
    console.log('Socket connection attempt with info:', { 
      netid, 
      userId, 
      socketId: socket.id,
      hasSession: !!socket.request.session,
      hasUserInfo: !!socket.userInfo
    });
    
    // Temporary for debugging - don't reject any connections
    /*
    if (!netid) {
      console.error('Socket connection rejected - missing netid');
      socket.disconnect(true);
      return;
    }
    */
    
    console.log(`Socket connected: ${netid} (${socket.id})`);
    
    // Emit welcome event with user info
    socket.emit('connected', {
      id: socket.id,
      netid
    });
    
    // Handle joining practice mode
    socket.on('practice:join', async () => {
      try {
        console.log(`User ${netid} joining practice mode`);
        
        // Check if player is already in a race
        let alreadyInRace = false;
        for (const [code, players] of racePlayers.entries()) {
          if (players.some(p => p.id === socket.id)) {
            alreadyInRace = true;
            console.log(`User ${netid} is already in race ${code}, leaving that race first`);
            
            // Leave existing race rooms
            socket.leave(code);
            
            // Clean up player from the race
            const updatedPlayers = players.filter(p => p.id !== socket.id);
            if (updatedPlayers.length === 0) {
              racePlayers.delete(code);
              activeRaces.delete(code);
            } else {
              racePlayers.set(code, updatedPlayers);
              
              // Notify other players
              io.to(code).emit('race:playersUpdate', {
                players: updatedPlayers.map(p => ({ netid: p.netid, ready: p.ready }))
              });
              
              // Broadcast player left message
              io.to(code).emit('race:playerLeft', { netid });
            }
          }
        }
        
        // Get a random snippet
        const snippet = await SnippetModel.getRandom();
        
        if (!snippet) {
          console.error('Failed to load snippet for practice mode');
          socket.emit('error', { message: 'Failed to load snippet' });
          return;
        }
        
        console.log(`Loaded snippet ID ${snippet.id} for practice mode`);
        
        // Create a practice lobby
        const lobby = await RaceModel.create('practice', snippet.id);
        console.log(`Created practice lobby with code ${lobby.code}`);
        
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
        console.log(`User ${netid} joining public lobby`);
        
        // Check if player is already in a race
        for (const [code, players] of racePlayers.entries()) {
          if (players.some(p => p.id === socket.id)) {
            console.log(`User ${netid} is already in race ${code}, leaving that race first`);
            
            // Leave existing race rooms
            socket.leave(code);
            
            // Clean up player from the race
            const updatedPlayers = players.filter(p => p.id !== socket.id);
            if (updatedPlayers.length === 0) {
              racePlayers.delete(code);
              activeRaces.delete(code);
            } else {
              racePlayers.set(code, updatedPlayers);
              
              // Notify other players
              io.to(code).emit('race:playersUpdate', {
                players: updatedPlayers.map(p => ({ netid: p.netid, ready: p.ready }))
              });
              
              // Broadcast player left message
              io.to(code).emit('race:playerLeft', { netid });
            }
          }
        }
        
        // Try to find an existing public lobby
        let lobby = await RaceModel.findPublicLobby();
        let snippet;
        
        // If no lobby exists, create a new one with a random snippet
        if (!lobby) {
          console.log('No existing public lobby found, creating a new one');
          snippet = await SnippetModel.getRandom();
          if (!snippet) {
            console.error('Failed to load snippet for public lobby');
            socket.emit('error', { message: 'Failed to load snippet' });
            return;
          }
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
          console.log(`Created new public lobby with code ${lobby.code}`);
        } else {
          console.log(`Found existing public lobby with code ${lobby.code}`);
          // Ensure active race exists for this lobby
          if (!activeRaces.has(lobby.code)) {
            // This is a safeguard against a race condition where the lobby exists in DB
            // but not in memory (server restart, etc.)
            console.log(`Lobby ${lobby.code} exists in database but not in memory, initializing...`);
            activeRaces.set(lobby.code, {
              id: lobby.id,
              code: lobby.code,
              snippet: {
                id: lobby.snippet_id,
                text: lobby.snippet_text
              },
              status: lobby.status || 'waiting',
              type: lobby.type,
              startTime: null
            });
            
            // Initialize player list if needed
            if (!racePlayers.has(lobby.code)) {
              racePlayers.set(lobby.code, []);
            }
          }
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
        const race = activeRaces.get(lobby.code);
        socket.emit('race:joined', {
          code: lobby.code,
          type: 'public',
          snippet: {
            id: race.snippet.id,
            text: race.snippet.text
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
        console.log(`User ${netid} is ready`);
        
        // Find the race this player is in
        for (const [code, players] of racePlayers.entries()) {
          const playerIndex = players.findIndex(p => p.id === socket.id);
          
          if (playerIndex !== -1) {
            console.log(`Found user ${netid} in race ${code}, marking as ready`);
            
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
        if (!players) {
          return;
        }
        
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
        
        // Validate the progress
        if (position < 0 || position > race.snippet.text.length) {
          console.warn(`Invalid position from ${netid}: ${position}`);
          return;
        }
        
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
          console.log(`User ${netid} has completed the race in lobby ${code}`);
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
        
        console.log(`Received race result from ${netid}: ${wpm} WPM, ${accuracy}% accuracy`);
        
        // Check if race exists
        const race = activeRaces.get(code);
        if (!race) {
          console.warn(`Race ${code} not found for result submission`);
          return;
        }
        
        // Get player info
        const players = racePlayers.get(code);
        if (!players) {
          console.warn(`Players list not found for race ${code}`);
          return;
        }
        
        const player = players.find(p => p.id === socket.id);
        
        if (!player) {
          console.warn(`Player ${netid} not found in race ${code}`);
          return;
        }
        
        // Get player progress
        const progress = playerProgress.get(socket.id);
        
        if (!progress || !progress.completed) {
          console.warn(`Progress data missing or incomplete for player ${netid}`);
          return;
        }
        
        // Calculate completion time
        const completionTime = (progress.timestamp - race.startTime) / 1000;
        
        console.log(`User ${netid} completed race in ${completionTime.toFixed(2)} seconds`);
        
        // Record race result in database
        try {
          await RaceModel.recordResult(
            player.userId,
            race.id,
            race.snippet.id,
            wpm,
            accuracy,
            completionTime
          );
          console.log(`Recorded race result for ${netid} in database`);
        } catch (dbErr) {
          console.error('Error recording race result in database:', dbErr);
        }
        
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
          console.log(`Removing user ${netid} from race ${code}`);
          
          // Remove player from race
          players.splice(playerIndex, 1);
          
          // If no players left, clean up race
          if (players.length === 0) {
            console.log(`No players left in race ${code}, cleaning up`);
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
          
          // Check if we should end the race early if all remaining players are finished
          const race = activeRaces.get(code);
          if (race && race.status === 'racing') {
            const allCompleted = players.every(p => {
              const progress = playerProgress.get(p.id);
              return progress && progress.completed;
            });
            
            if (allCompleted && players.length > 0) {
              console.log(`All remaining players in race ${code} have finished, ending race`);
              endRace(io, code).catch(err => {
                console.error(`Error ending race ${code} after disconnect:`, err);
              });
            }
          }
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
  const race = activeRaces.get(code);
  
  if (!race || race.status !== 'waiting') {
    console.log(`Race ${code} is not in waiting status, cannot start countdown`);
    return;
  }
  
  // Need at least 2 players for public races
  if (race.type === 'public' && (!players || players.length < 2)) {
    console.log(`Not enough players (${players ? players.length : 0}) in public race ${code} to start countdown`);
    return;
  }
  
  // Check if all players are ready
  const allReady = players.every(p => p.ready);
  
  if (allReady) {
    console.log(`All players in race ${code} are ready, starting countdown`);
    startCountdown(io, code);
  } else {
    console.log(`Not all players in race ${code} are ready, waiting`);
  }
};

// Start the countdown for a race
const startCountdown = async (io, code) => {
  try {
    const race = activeRaces.get(code);
    
    if (!race || race.status !== 'waiting') {
      console.warn(`Race ${code} is not in waiting status, cannot start countdown`);
      return;
    }
    
    console.log(`Starting countdown for race ${code}`);
    
    // Update race status to countdown
    race.status = 'countdown';
    activeRaces.set(code, race);
    
    // Update database status
    try {
      await RaceModel.updateStatus(race.id, 'countdown');
      console.log(`Updated race ${code} status to countdown in database`);
    } catch (dbErr) {
      console.error(`Error updating race ${code} status in database:`, dbErr);
    }
    
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
      console.warn(`Race ${code} is not in countdown status, cannot start race`);
      return;
    }
    
    console.log(`Starting race ${code}`);
    
    // Update race status to racing
    race.status = 'racing';
    race.startTime = Date.now();
    activeRaces.set(code, race);
    
    // Update database status
    try {
      await RaceModel.updateStatus(race.id, 'racing');
      console.log(`Updated race ${code} status to racing in database`);
    } catch (dbErr) {
      console.error(`Error updating race ${code} status in database:`, dbErr);
    }
    
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
      console.warn(`Race ${code} is not in racing status, cannot handle player finish`);
      return;
    }
    
    const players = racePlayers.get(code);
    if (!players) {
      console.warn(`Players list not found for race ${code}`);
      return;
    }
    
    const player = players.find(p => p.id === playerId);
    
    if (!player) {
      console.warn(`Player ${playerId} not found in race ${code}`);
      return;
    }
    
    console.log(`Player ${player.netid} has finished race ${code}`);
    
    // Check if all players have finished
    const allCompleted = players.every(p => {
      const progress = playerProgress.get(p.id);
      return progress && progress.completed;
    });
    
    // If all players are done, end the race
    if (allCompleted) {
      console.log(`All players in race ${code} have finished, ending race`);
      await endRace(io, code);
    } else {
      console.log(`Waiting for remaining players to finish race ${code}`);
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
      console.warn(`Race ${code} is not in racing status, cannot end race`);
      return;
    }
    
    console.log(`Ending race ${code}`);
    
    // Update race status
    race.status = 'finished';
    activeRaces.set(code, race);
    
    // Update database
    try {
      await RaceModel.updateStatus(race.id, 'finished');
      console.log(`Updated race ${code} status to finished in database`);
    } catch (dbErr) {
      console.error(`Error updating race ${code} status in database:`, dbErr);
    }
    
    // Get race results
    let results = [];
    try {
      results = await RaceModel.getResults(race.id);
      console.log(`Retrieved ${results.length} results for race ${code}`);
    } catch (dbErr) {
      console.error(`Error getting results for race ${code}:`, dbErr);
    }
    
    // Broadcast race end
    io.to(code).emit('race:end', { results });
  } catch (err) {
    console.error('Error ending race:', err);
  }
};

module.exports = {
  initialize
};