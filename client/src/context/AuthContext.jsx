import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

// Create context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/auth/status');
        
        if (response.data.authenticated && response.data.user) {
          setUser(response.data.user);
          setAuthenticated(true);
          
          // Store user in window object for socket.io access
          window.user = response.data.user;
        } else {
          setUser(null);
          setAuthenticated(false);
          window.user = null;
        }
        
        setError(null);
      } catch (err) {
        console.error('Error checking authentication status:', err);
        setUser(null);
        setAuthenticated(false);
        window.user = null;
        setError('Failed to check authentication status');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Function to handle login
  const login = () => {
    // Redirect to the CAS login
    window.location.href = '/auth/login';
  };

  // Function to handle logout
  const logout = () => {
    // Redirect to the CAS logout
    window.location.href = '/auth/logoutcas';
  };

  // Function to fetch user profile after login
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/profile');
      
      if (response.data) {
        setUser(response.data);
        setAuthenticated(true);
        // Store user in window object for socket.io access
        window.user = response.data;
        return response.data;
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to fetch user profile');
      return null;
    } finally {
      setLoading(false);
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
      fetchUserProfile
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