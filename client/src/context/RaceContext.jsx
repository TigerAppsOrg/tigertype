import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

// Create context
const RaceContext = createContext(null);

export const RaceProvider = ({ children }) => {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  
  // Race state
  const [raceState, setRaceState] = useState({
    code: null,
    type: null,
    snippet: null,
    players: [],
    startTime: null,
    inProgress: false,
    completed: false,
    results: []
  });
  
  // Local typing state
  const [typingState, setTypingState] = useState({
    input: '',
    position: 0,
    correctChars: 0,
    errors: 0,
    completed: false,
    wpm: 0,
    accuracy: 0
  });

  // Initialize Socket.IO event listeners when socket is available
  useEffect(() => {
    if (!socket || !connected) return;

    // Event handlers
    const handleRaceJoined = (data) => {
      console.log('Joined race:', data);
      setRaceState(prev => ({
        ...prev,
        code: data.code,
        type: data.type,
        snippet: data.snippet,
        players: data.players || []
      }));
    };

    const handlePlayersUpdate = (data) => {
      setRaceState(prev => ({
        ...prev,
        players: data.players
      }));
    };

    const handleRaceStart = (data) => {
      setRaceState(prev => ({
        ...prev,
        startTime: data.startTime,
        inProgress: true
      }));
      
      // Reset typing state
      setTypingState({
        input: '',
        position: 0,
        correctChars: 0,
        errors: 0,
        completed: false,
        wpm: 0,
        accuracy: 0
      });
    };

    const handlePlayerProgress = (data) => {
      setRaceState(prev => {
        // Update players array with progress
        const updatedPlayers = prev.players.map(player => {
          if (player.netid === data.netid) {
            return {
              ...player,
              progress: data.percentage,
              position: data.position,
              completed: data.completed
            };
          }
          return player;
        });
        
        return {
          ...prev,
          players: updatedPlayers
        };
      });
    };

    const handlePlayerResult = (data) => {
      setRaceState(prev => {
        // Find if this player is already in results
        const resultIndex = prev.results.findIndex(r => r.netid === data.netid);
        let newResults = [...prev.results];
        
        if (resultIndex !== -1) {
          // Update existing result
          newResults[resultIndex] = data;
        } else {
          // Add new result
          newResults.push(data);
        }
        
        // Sort by WPM
        newResults.sort((a, b) => b.wpm - a.wpm);
        
        return {
          ...prev,
          results: newResults
        };
      });
    };

    const handleRaceEnd = (data) => {
      setRaceState(prev => ({
        ...prev,
        inProgress: false,
        completed: true,
        results: data.results
      }));
    };

    // Register event listeners
    socket.on('race:joined', handleRaceJoined);
    socket.on('race:playersUpdate', handlePlayersUpdate);
    socket.on('race:start', handleRaceStart);
    socket.on('race:playerProgress', handlePlayerProgress);
    socket.on('race:playerResult', handlePlayerResult);
    socket.on('race:end', handleRaceEnd);
    
    // Clean up on unmount
    return () => {
      socket.off('race:joined', handleRaceJoined);
      socket.off('race:playersUpdate', handlePlayersUpdate);
      socket.off('race:start', handleRaceStart);
      socket.off('race:playerProgress', handlePlayerProgress);
      socket.off('race:playerResult', handlePlayerResult);
      socket.off('race:end', handleRaceEnd);
    };
  }, [socket, connected]);

  // Methods for race actions
  const joinPracticeMode = () => {
    if (!socket || !connected) return;
    console.log('Joining practice mode...');
    socket.emit('practice:join');
  };

  const joinPublicRace = () => {
    if (!socket || !connected) return;
    console.log('Joining public race...');
    socket.emit('public:join');
  };

  const setPlayerReady = () => {
    if (!socket || !connected) return;
    console.log('Setting player ready...');
    socket.emit('player:ready');
  };

  const updateProgress = (input, snippet) => {
    if (!socket || !connected || !raceState.inProgress) return;
    
    const position = input.length;
    const completed = position === snippet.length && input === snippet;
    
    // Calculate correct characters
    let correctChars = 0;
    for (let i = 0; i < input.length && i < snippet.length; i++) {
      if (input[i] === snippet[i]) {
        correctChars++;
      }
    }
    
    // Calculate errors
    const errors = input.length - correctChars;
    
    // Calculate WPM and accuracy
    let wpm = 0;
    let accuracy = 0;
    
    if (raceState.startTime) {
      const elapsedSeconds = (Date.now() - raceState.startTime) / 1000;
      const minutes = elapsedSeconds / 60;
      wpm = (input.length / 5) / minutes; // standard: 5 chars = 1 word
      accuracy = snippet.length > 0 ? (correctChars / position) * 100 : 0;
    }
    
    // Update local typing state
    setTypingState({
      input,
      position,
      correctChars,
      errors,
      completed,
      wpm,
      accuracy: position > 0 ? (correctChars / position) * 100 : 100
    });
    
    // Calculate progress percentage
    const percentage = Math.floor((position / snippet.length) * 100);
    
    // Send progress to server
    socket.emit('race:progress', {
      code: raceState.code,
      position,
      percentage,
      completed
    });
    
    // If completed, send final result
    if (completed) {
      socket.emit('race:result', {
        code: raceState.code,
        wpm,
        accuracy: position > 0 ? (correctChars / position) * 100 : 100
      });
    }
  };

  const resetRace = () => {
    setRaceState({
      code: null,
      type: null,
      snippet: null,
      players: [],
      startTime: null,
      inProgress: false,
      completed: false,
      results: []
    });
    
    setTypingState({
      input: '',
      position: 0,
      correctChars: 0,
      errors: 0,
      completed: false,
      wpm: 0,
      accuracy: 0
    });
  };

  return (
    <RaceContext.Provider value={{ 
      raceState, 
      typingState,
      joinPracticeMode,
      joinPublicRace,
      setPlayerReady,
      updateProgress,
      resetRace
    }}>
      {children}
    </RaceContext.Provider>
  );
};

// Custom hook to use the race context
export const useRace = () => {
  const context = useContext(RaceContext);
  if (!context) {
    throw new Error('useRace must be used within a RaceProvider');
  }
  return context;
};

export default RaceContext;