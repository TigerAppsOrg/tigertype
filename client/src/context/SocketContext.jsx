import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Craete context
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

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [socketLoaded, setSocketLoaded] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socketInstance = io(socketOptions);
    
    // Set up event listeners
    socketInstance.on('connect', () => {
      console.log('Socket connected successfully with ID:', socketInstance.id);
      setConnected(true);
      setError(null);
    });
    
    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setConnected(false);
      
      if (err && err.message && err.message.includes('Authentication')) {
        setError('Authentication required');
      } else {
        setError(err.message || 'Connection failed');
      }
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      
      if (reason === 'io server disconnect') {
        // The server has disconnected us, attempt to reconnect
        socketInstance.connect();
      }
    });
    
    // Store socket instance in state
    setSocket(socketInstance);
    setSocketLoaded(true);
    
    // Connect after initialization
    socketInstance.connect();
    
    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('connect_error');
    };
  }, []);

  // Reconnect function
  const reconnect = () => {
    if (socket && !connected) {
      socket.connect();
    }
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