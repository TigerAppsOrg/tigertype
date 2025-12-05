import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { RaceContext } from './RaceContext'; // Import RaceContext object, not useRace hook

// Create context
const SocketContext = createContext(null);

// Socket options
const socketOptions = {
  withCredentials: true,
  autoConnect: false, // Don't connect immediately to allow auth to be set up
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
};

const dispatchSocketEvent = (eventName, detail = {}) => {
  try {
    window.dispatchEvent(new CustomEvent(`tigertype:${eventName}`, { detail }));
  } catch (err) {
    console.error('Error dispatching socket event', eventName, err);
  }
};

export const SocketProvider = ({ children }) => {
  const { user, authenticated } = useAuth();
  const raceContext = useContext(RaceContext); 
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [socketLoaded, setSocketLoaded] = useState(false);

  // Initialize socket when auth is confirmed
  useEffect(() => {
    if (!authenticated) return;
    
    // Avoid recreating socket connection if already exist
    if (socket && connected) return;
    
    // console.log('Initializing socket connection');
    
    // Initialize Socket.IO connection
    const socketInstance = io(socketOptions);
    
    // Set up event listeners
    socketInstance.on('connect', () => {
      // console.log('Socket connected successfully with ID:', socketInstance.id);
      setConnected(true);
      setError(null);
      dispatchSocketEvent('connect', { id: socketInstance.id });
      
      // Keep window.user up-to-date w/ the latest user data from AuthContext
      if (user) {
        window.user = user;
      }
    });
    
    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setConnected(false);
      dispatchSocketEvent('connect-error', { message: err?.message });
      
      if (err && err.message && err.message.includes('Authentication')) {
        setError('Authentication required');
      } else {
        setError(err.message || 'Connection failed');
      }
    });
    
    socketInstance.on('disconnect', (reason) => {
      // console.log('Socket disconnected:', reason);
      setConnected(false);
      dispatchSocketEvent('disconnect', { id: socketInstance.id, reason });
      
      if (reason === 'io server disconnect') {
        // The server has disconnected us, attempt to reconnect
        // Do not auto-reconnect here if the disconnect was forced
        // The server logic handles the forced disconnect
        console.log('Server disconnected socket. Potential reconnection needed manually or by page refresh.');
        // Example: Show a message to the user
        // setError('Disconnected by server. Please refresh or try logging in again.'); 
      }
      // else if reason === 'transport close', etc. - client initiated or network issue
      // Let the default reconnection logic handle these
    });
    
    // Listener for forced disconnect due to new session
    socketInstance.on('force_disconnect', (data) => {
      const reason = data?.reason || 'Disconnected due to activity in another session.';
      console.warn(`Force disconnected by server: ${reason}`);
      alert(reason); // Show alert popup
      setConnected(false);
      setError(reason);
      dispatchSocketEvent('forced-disconnect', { id: socketInstance.id, reason });

      // Reset race state if RaceContext is available
      if (raceContext && raceContext.resetRace) {
        console.log('Resetting race state due to forced disconnect.');
        raceContext.resetRace();
      }
      
      // Explicitly disconnect the socket instance on the client side as well
      socketInstance.disconnect();
    });

    // Store socket instance in state
    setSocket(socketInstance);
    setSocketLoaded(true);
    
    // Connect after initialization
    socketInstance.connect();
    
    // Clean up on unmount
    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('connect_error');
      socketInstance.off('force_disconnect');
      socketInstance.disconnect();
    };
  }, [authenticated, raceContext]); // Add raceContext to dependency array

  // Reconnect function
  const reconnect = () => {
    if (socket && !connected) {
      socket.connect();
    }
  };

  // TBH joinPracticeMode function seems redundant here?
  // RaceContext alr provides methods to join races
  // keeping it for now, but it might be redundant
  const joinPracticeMode = () => {
    if (!socket || !connected) return;
    
    // Request a practice mode
    socket.emit('practice:join', {
      testMode: 'snippet',  // default to snippet mode
      testDuration: 15      // default to 15 seconds
    });
  };

  return (
    <SocketContext.Provider value={{ socket, connected, error, reconnect, socketLoaded }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
