import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';

// Create context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null); // Renamed internal setter
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  // Function to fetch user profile data
  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/profile');
      if (response.data) {
        // Ensure has_completed_tutorial is included, defaulting if necessary
        const userData = {
          ...response.data,
          has_completed_tutorial: response.data.has_completed_tutorial ?? false,
        };
        setUserState(userData);
        setAuthenticated(true);
        window.user = userData; // Update window object
        setError(null);
        return userData;
      } else {
        // Handle case where profile endpoint returns no data unexpectedly
        setUserState(null);
        setAuthenticated(false);
        window.user = null;
        setError('Failed to retrieve user profile data.');
        return null;
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // Don't nullify user/auth state if profile fetch fails after initial auth check
      // setError('Failed to fetch user profile'); 
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array, this function doesn't depend on component state

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        const authResponse = await axios.get('/auth/status');

        if (authResponse.data.authenticated && authResponse.data.user) {
          // Authenticated via CAS, now fetch full profile
          await fetchUserProfile(); // fetchUserProfile handles setting state
        } else {
          setUserState(null);
          setAuthenticated(false);
          window.user = null;
        }
        setError(null);
      } catch (err) {
        console.error('Error checking authentication status:', err);
        setUserState(null);
        setAuthenticated(false);
        window.user = null;
        setError('Failed to check authentication status');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [fetchUserProfile]); // Depend on fetchUserProfile

  // Monitor socket connection status to update user data on reconnect
  useEffect(() => {
    let isInitialConnection = true;
    const handleSocketConnect = () => {
      if (authenticated && !isInitialConnection) {
        console.log('Socket reconnected, refreshing user profile data');
        fetchUserProfile();
      }
      isInitialConnection = false;
    };

    if (window.socket) {
      window.socket.on('connect', handleSocketConnect);
    }

    return () => {
      if (window.socket) {
        window.socket.off('connect', handleSocketConnect);
      }
    };
  }, [authenticated, fetchUserProfile]); // Depend on auth status and fetch function

  // Function to handle login
  const login = () => {
    window.location.href = '/auth/login';
  };

  // Function to handle logout
  const logout = () => {
    window.location.href = '/auth/logout';
  };

  // Function to update user data locally
  const updateUser = (userData) => {
    setUserState(prevUser => {
      const updatedUser = { ...prevUser, ...userData };
      window.user = updatedUser; // Keep window object in sync
      return updatedUser;
    });
  };

  // Function to mark the tutorial as completed
  const markTutorialComplete = useCallback(async () => {
    if (!user || !user.id) {
      console.error('Cannot mark tutorial complete: user not loaded or missing ID.');
      return;
    }
    try {
      // Call the backend API
      const response = await axios.put('/api/user/tutorial-complete');
      if (response.status === 200 && response.data.user) {
        // Update local user state to reflect the change
        updateUser({ has_completed_tutorial: true });
        console.log('Tutorial marked as complete locally and on backend.');
      } else {
        console.error('Backend failed to mark tutorial as complete.', response.data);
        // Optionally set an error state here
      }
    } catch (err) {
      console.error('Error calling backend to mark tutorial complete:', err);
      // Optionally set an error state here
    }
  }, [user]); // Depends on the user object (specifically user.id)

  return (
    <AuthContext.Provider value={{
      user,
      authenticated,
      loading,
      error,
      login,
      logout,
      fetchUserProfile,
      setUser: updateUser, // Expose updateUser
      markTutorialComplete // Expose the new function
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;