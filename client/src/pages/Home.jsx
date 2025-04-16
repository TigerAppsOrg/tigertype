import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRace } from '../context/RaceContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import Modes from '../components/Modes';
import ProfileWidget from '../components/ProfileWidget';
import Modal from '../components/Modal';
import './Home.css';
import JoinLobbyPanel from '../components/JoinLobbyPanel';

function Home() {
  const { user, authenticated, loading, fetchUserProfile } = useAuth();
  const { 
    joinPracticeMode,
    joinPublicRace,
    createPrivateLobby, // Add createPrivateLobby
    // joinPrivateLobby, // Add joinPrivateLobby (if needed later)
    raceState,
    inactivityState,
    dismissInactivityKick,
    setInactivityState
  } = useRace();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Check URL params for inactivity kick
  useEffect(() => {
    // If redirected bc of inactivity, URL might have a query param
    const kickParam = searchParams.get('kicked');
    if (kickParam === 'inactivity') {
      console.log('User was redirected due to inactivity kick');
      
      // Explicitly set the inactivity state to avoid being lost during redirect
      setInactivityState({
        warning: false,
        warningMessage: '',
        kicked: true,
        kickMessage: 'You have been removed from the lobby due to inactivity. Please ready up promptly when joining a race.',
        redirectToHome: false
      });
      
      // Remove the query parameter after handling
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('kicked');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, setInactivityState]);
  
  // Handle race/lobby joining navigation
  useEffect(() => {
    // If a race/lobby code exists, navigate to the appropriate page
    if (raceState.code) {
      if (raceState.type === 'private') {
        navigate(`/lobby/${raceState.code}`); // Navigate to lobby page for private
      } else {
        navigate('/race'); // Navigate to race page for public/practice
      }
    }
  }, [raceState.code, raceState.type, navigate]);

  useEffect(() => {
    if (searchParams.get('refreshUser') === 'true') {
      fetchUserProfile?.().then(() => {
        // Remove the query parameter after refreshing
        searchParams.delete('refreshUser');
        setSearchParams(searchParams, { replace: true });
      });
    }
  }, [searchParams, fetchUserProfile, setSearchParams]);
  
  // Define game modes
  const gameModes = [
    { 
      id: 1, 
      name: 'Solo Practice', 
      description: 'Improve your typing skills at your own pace', 
      action: joinPracticeMode 
    },
    { 
      id: 2, 
      name: 'Quick Match', 
      description: 'Race against other Princeton students', 
      action: joinPublicRace
    },
    {
      id: 3,
      name: 'Private Match', // Rename
      description: 'Create or join a private lobby with friends', // Update description
      action: createPrivateLobby, // Set action to create lobby
      // disabled: false // Remove disabled state (or ensure it's false)
    }
    // TODO: Add a separate "Join Lobby" option/modal if desired
  ];
  
  return (
    <div className="home-page">
      {/* Inactivity Kick Modal */}
      <Modal
        isOpen={inactivityState.kicked}
        title="Removed for Inactivity"
        message={inactivityState.kickMessage || "You have been removed from the lobby due to inactivity."}
        buttonText="I Understand"
        onClose={dismissInactivityKick}
      />
      
      <div className="home-container">
        <div className="home-header">
          <h1>Start Your Game</h1>
        </div>
        
        <div className="modes-section">
          <Modes modes={gameModes}>
            <JoinLobbyPanel />
          </Modes>
        </div>
        
        <div className="home-footer">
          <p>Select a mode to get started!</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
