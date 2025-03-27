import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRace } from '../context/RaceContext';
import Modes from '../components/Modes';
import ProfileWidget from '../components/ProfileWidget';
import './Home.css';

function Home() {
  const { user, authenticated, loading } = useAuth();
  const { joinPracticeMode, joinPublicRace, raceState } = useRace();
  const navigate = useNavigate();
  
  // Handle race joining
  useEffect(() => {
    // If race is joined, navigate to race page
    if (raceState.code) {
      navigate('/race');
    }
  }, [raceState.code, navigate]);
  
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
      <div className="home-container">
        <div className="home-header">
          <h1>Start Your Game</h1>
          
          <div className="user-section">
            <ProfileWidget user={user} />
          </div>
        </div>
        
        <div className="modes-section">
          <Modes modes={gameModes} />
        </div>
        
        <div className="home-footer">
          <p>Select a mode to get started!</p>
        </div>
      </div>
    </div>
  );
}

export default Home;