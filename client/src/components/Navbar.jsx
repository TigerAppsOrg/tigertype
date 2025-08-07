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
      color: hoveredLink === linkName ? '#F58025' : 'var(--mode-text-color)',
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
    const route = window.location.pathname.startsWith('/race') ? 'practice' : 'home';
    startTutorial(route);
  };

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <button type='button' onClick={handleLogo} className="logo-button">
          <img src={navbarLogo} alt="TigerType" />
        </button>
        {/* Icon buttons */}
        <div className="navbar-icons">
          {authenticated && (
            <>
              <button
                className="settings-button navbar-settings-icon"
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
                <span className="material-icons">help_outline</span>
              </button>
            </>
          )}
          {/* GitHub link (always visible) */}
          <a
            className="navbar-github-icon"
            href="https://github.com/ammaar-alam/tigertype"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open project on GitHub"
            title="Open project on GitHub"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fillRule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38C13.71 14.53 16 11.54 16 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
          </a>
        </div>
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
            <ProfileWidget user={user} layout="navbar"/>
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
    </header>
  );
}

// Add PropTypes validation
Navbar.propTypes = {
  onOpenLeaderboard: PropTypes.func,
  onLoginClick: PropTypes.func,
};

export default Navbar;
