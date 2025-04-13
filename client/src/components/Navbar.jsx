import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ProfileWidget from './ProfileWidget'; 
import Settings from './Settings';
import './Navbar.css';
import { useRace } from '../context/RaceContext';
import PropTypes from 'prop-types'; // Import PropTypes

function Navbar({ onOpenLeaderboard, onLoginClick }) { // Add props
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { authenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    raceState,
    typingState,
    setPlayerReady,
    resetRace
  } = useRace();

  const handleLogo = () => {
    resetRace();
    navigate('/home');
  };

  // Style to ensure no border appears
  const buttonStyle = {
    border: 'none',
    outline: 'none',
    boxShadow: 'none'
  };

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <button type='text' onClick={handleLogo}>TigerType</button>
        {/* Conditionally render settings button only when authenticated */}
        {authenticated && (
          <button
            className="settings-button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
            tabIndex={0}
          >
            <span className="material-icons settings-icon">settings</span>
          </button>
        )}
      </div>
      
      <nav className="navbar-links">
        {authenticated ? (
          <>
            {/* Common items for both logged-in and logged-out states */}
            <a href="#" onClick={onOpenLeaderboard} className="navbar-link">Leaderboard</a>
            <a href="#" className="navbar-link">About Us</a>
            
            {/* Logged-in specific items */}
            <button onClick={logout} className="logout-button">Logout</button>
            <ProfileWidget user={user}/>
          </>
        ) : (
          <>
            {/* Logged-out Navbar items */}
            <a href="#" onClick={onOpenLeaderboard} className="navbar-link">Leaderboard</a>
            <a href="#" className="navbar-link">About Us</a>
            <button onClick={onLoginClick} className="login-nav-button">Log In</button>
          </>
        )}
      </nav>

      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
      />
    </header>
  );
}

// Add PropTypes validation
Navbar.propTypes = {
  onOpenLeaderboard: PropTypes.func,
  onLoginClick: PropTypes.func,
};

export default Navbar;