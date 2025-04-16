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

function Home() {
  const { user, authenticated, loading, fetchUserProfile } = useAuth();
  const { 
    joinPracticeMode, 
    joinPublicRace, 
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
  
  // Handle race joining
  useEffect(() => {
    // If race is joined, navigate to race page
    if (raceState.code) {
      navigate('/race');
    }
  }, [raceState.code, navigate]);

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
      name: 'Custom Lobby', 
      description: 'Coming soon! Create a private lobby with friends', 
      action: null,
      disabled: true
    }
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
          <Modes modes={gameModes} />
        </div>

        {/* Delete this button after integrating front-end */}
        <button onClick={() => {
            navigate('/lobby');
          }}>
          Test for Custom Lobby
        </button>
        
        <div className="home-footer">
          <p>Select a mode to get started!</p>
        </div>
      </div>
    </div>
  );
}

export default Home;