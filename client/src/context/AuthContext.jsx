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
        const userData = {
          ...response.data,
          has_completed_tutorial: response.data.has_completed_tutorial ?? false,
          has_unseen_changelog: response.data.has_unseen_changelog ?? false,
          last_seen_changelog_id: response.data.last_seen_changelog_id ?? null,
          last_seen_changelog_at: response.data.last_seen_changelog_at ?? null,
          latest_changelog_id: response.data.latest_changelog_id ?? null,
          latest_changelog_title: response.data.latest_changelog_title ?? null,
          latest_changelog_published_at: response.data.latest_changelog_published_at ?? null,
        };
        // Fetch user titles
        try {
          const titlesRes = await axios.get('/api/user/titles');
          userData.titles = titlesRes.data || [];
        } catch (titlesErr) {
          console.error('Error fetching user titles:', titlesErr);
          userData.titles = [];
        }
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

  const markChangelogSeen = useCallback(async (changelogId) => {
    try {
      const payload = changelogId ? { changelogId } : {};
      const { data } = await axios.post('/api/changelog/mark-read', payload);
      setUserState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          has_unseen_changelog: false,
          last_seen_changelog_id: data.last_seen_changelog_id ?? prev.last_seen_changelog_id,
          last_seen_changelog_at: data.last_seen_changelog_at ?? prev.last_seen_changelog_at
        };
      });
      return data;
    } catch (err) {
      console.error('Error marking changelog as seen:', err);
      throw err;
    }
  }, []);

  // Helper function to mark tutorial as complete
  const markTutorialComplete = async () => {
    // If user is already available
    if (user && user.netid) {
      try {
        // console.log('Marking tutorial as completed for user:', user.netid);
        const response = await fetch('/api/users/tutorial/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          // console.log('Tutorial marked as completed successfully');
          // Update local user state
          setUser(prev => ({ ...prev, has_completed_tutorial: true }));
        } else {
          // console.error('Failed to mark tutorial as completed:', await response.text());
        }
      } catch (error) {
        console.error('Error marking tutorial as completed:', error);
      }
    } else {
      // console.log('User data not immediately available for markTutorialComplete, waiting 500ms...');
      try {
        // Wait a moment and try again
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if user data is available now
        if (user && user.netid) {
          await markTutorialComplete(); // Recursive call with user data
        } else {
          console.error('Cannot mark tutorial complete: User data still not available after waiting.');
        }
      } catch (err) {
        console.error('Error in delayed markTutorialComplete:', err);
    }
    }
  };

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
      markChangelogSeen,
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
