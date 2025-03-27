import React, { createContext, useContext } from 'react';

// Mock Race Context
export const MockRaceContext = createContext();

export const mockRaceState = {
  inProgress: false,
  type: 'practice',
  snippet: {
    text: 'This is a test snippet for typing practice.',
    title: 'Test Snippet'
  },
  players: [
    { netid: 'player1', progress: 30 },
    { netid: 'player2', progress: 20 }
  ],
  startTime: Date.now()
};

export const mockTypingState = {
  position: 0,
  correctChars: 0,
  completed: false
};

export const MockRaceProvider = ({ children, mockState = {} }) => {
  const state = {
    ...mockRaceState,
    ...mockState
  };

  const typing = {
    ...mockTypingState
  };

  const updateProgress = jest.fn();

  return (
    <MockRaceContext.Provider value={{ raceState: state, typingState: typing, updateProgress }}>
      {children}
    </MockRaceContext.Provider>
  );
};

export const useRace = () => {
  const context = useContext(MockRaceContext);
  if (!context) {
    throw new Error('useRace must be used within a RaceProvider');
  }
  return context;
};

// Mock Auth Context
export const MockAuthContext = createContext();

export const MockAuthProvider = ({ children, isAuthenticated = false, mockUser = null, mockLogout = () => {} }) => {
  return (
    <MockAuthContext.Provider 
      value={{ 
        authenticated: isAuthenticated, 
        user: mockUser, 
        logout: mockLogout 
      }}
    >
      {children}
    </MockAuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 