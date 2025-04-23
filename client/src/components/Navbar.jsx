import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ProfileWidget from './ProfileWidget'; 
import Settings from './Settings';
import './Navbar.css';
import { useRace } from '../context/RaceContext';
import PropTypes from 'prop-types'; // Import PropTypes
import navbarLogo from '../assets/logos/navbar-logo.png';
import TutorialGuide from './TutorialGuide'; // Import TutorialGuide
import { useTutorial } from '../context/TutorialContext';

function Navbar({ onOpenLeaderboard, onLoginClick }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { authenticated, user, logout, markTutorialComplete } = useAuth();
  const { isTutorialRunning, startTutorial, endTutorial } = useTutorial();
  const navigate = useNavigate();
  const {
    raceState,
    typingState,
    setPlayerReady,
    resetRace
  } = useRace();

  // State to track hover state of each link
  const [hoveredLink, setHoveredLink] = useState(null);

  const handleLogo = () => {
    resetRace();
    navigate('/home');
  };

  // Base style for all navbar links
  const getLinkStyle = (linkName) => {
    return {
      color: hoveredLink === linkName ? '#F58025' : '#e0e0e0',
      textDecoration: 'none',
      fontFamily: 'inherit',
      cursor: 'pointer'
    };
  };

  // Function to handle the end of the tutorial (called by TutorialGuide)
  const handleTutorialEnd = () => {
    endTutorial();
  };

  // Function to start the tutorial replay
  const startTutorialReplay = () => {
    startTutorial();
  };

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <button type='button' onClick={handleLogo} className="logo-button"> {/* Added className */} 
          <img src={navbarLogo} alt="TigerType" />
        </button>
        {/* Buttons container */} 
        {authenticated && (
          <div className="navbar-icons"> {/* Added container for icons */} 
            <button
              className="settings-button navbar-settings-icon" // Added identifier class
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
              tabIndex={0}
            >
              <span className="material-icons">settings</span>
            </button>
            {/* Tutorial Replay Button */} 
            <button
              className="tutorial-replay-button"
              onClick={startTutorialReplay}
              aria-label="Replay tutorial"
              tabIndex={0}
            >
              <span className="material-icons">help_outline</span> {/* Question mark icon */}
            </button>
          </div>
        )}
      </div>
      <nav className="navbar-links">
        {authenticated ? (
          <>
            {/* Common items for both logged-in and logged-out states */}
            <a 
              href="#" 
              onClick={onOpenLeaderboard} 
              className="navbar-link" 
              style={getLinkStyle('leaderboard')}
              onMouseEnter={() => setHoveredLink('leaderboard')}
              onMouseLeave={() => setHoveredLink(null)}
            >
              Leaderboard
            </a>
            <Link
              to="/about" // Changed to Link component
              className="navbar-link"
              style={getLinkStyle('about')}
              onMouseEnter={() => setHoveredLink('about')}
              onMouseLeave={() => setHoveredLink(null)}
            >
              About Us / FAQ
            </Link>
            
            {/* Logged-in specific items */}
            <button onClick={logout} className="logout-button">Logout</button>
            <ProfileWidget user={user}/>
          </>
        ) : (
          <>
            {/* Logged-out Navbar items */}
            <a 
              href="#" 
              onClick={onOpenLeaderboard} 
              className="navbar-link" 
              style={getLinkStyle('leaderboard')}
              onMouseEnter={() => setHoveredLink('leaderboard')}
              onMouseLeave={() => setHoveredLink(null)}
            >
              Leaderboard
            </a>
            <Link
              to="/about" // Changed to Link component
              className="navbar-link"
              style={getLinkStyle('about')}
              onMouseEnter={() => setHoveredLink('about')}
              onMouseLeave={() => setHoveredLink(null)}
            >
              About Us / FAQ
            </Link>
            <button onClick={onLoginClick} className="login-nav-button">Log In</button>
          </>
        )}
      </nav>

      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
      />
      
      {/* Render TutorialGuide conditionally based on authenticated status */} 
      {authenticated && <TutorialGuide />}
    </header>
  );
}

// Add PropTypes validation
Navbar.propTypes = {
  onOpenLeaderboard: PropTypes.func,
  onLoginClick: PropTypes.func,
};

export default Navbar;