import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar'; // Import Navbar
import Modal from '../components/Modal'; // Import Modal
import Leaderboard from '../components/Leaderboard'; // Import Leaderboard
import './Landing.css';
import tigerLogo from '../assets/tigertype-logo.png'; // Use the simpler icon

const HONOR_CODE = "I pledge my honour that I have not violated the honour code during this examination.";
const TYPING_SPEED_MS = 100; // Milliseconds per character
const MISTAKE_CHANCE = 0.04; // 4% chance of making a mistake per character
const MISTAKE_PAUSE_MS = 300; // Pause after making mistake
const BACKSPACE_PAUSE_MS = 150; // Pause after backspacing
const PAUSE_DURATION_MS = 3000; // Pause between Honor Code and snippet

function Landing() {
  const { login } = useAuth();
  const [fullText, setFullText] = useState(HONOR_CODE); // The complete text to display (Honor Code or snippet)
  const [charIndex, setCharIndex] = useState(0); // Current position in the text
  const [stage, setStage] = useState('honorCode'); // 'honorCode', 'fetching', 'snippet'
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false); // State for modal
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true); // Track mount status for cleanup
  const [mistakeActive, setMistakeActive] = useState(false); // Track if a mistake is shown
  const [mistakeChar, setMistakeChar] = useState(''); // The incorrect char to display

  // --- Animation Logic ---

  // Function to start the animation progress for a given text
  const startAnimationProgress = (textToAnimate) => {
    if (!isMountedRef.current) return; // Prevent updates if unmounted

    setFullText(textToAnimate); // Set the full text immediately
    setCharIndex(0); // Reset index

    if (intervalRef.current) clearInterval(intervalRef.current);

    const typeCharacter = () => {
      if (!isMountedRef.current) return;

      setCharIndex((prevIndex) => {
        if (prevIndex >= textToAnimate.length) {
           // End of text reached
           clearInterval(intervalRef.current);
           if (stage === 'honorCode') {
             if (timeoutRef.current) clearTimeout(timeoutRef.current);
             timeoutRef.current = setTimeout(() => {
               if (isMountedRef.current) setStage('fetching');
             }, PAUSE_DURATION_MS);
           }
           return prevIndex;
        }

        // --- Mistake Logic ---
        if (Math.random() < MISTAKE_CHANCE && !mistakeActive) {
          clearInterval(intervalRef.current); // Stop typing
          const incorrectChar = getRandomChar(textToAnimate[prevIndex]);
          setMistakeChar(incorrectChar);
          setMistakeActive(true);

          // Pause, then backspace, then resume
          timeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;
            setMistakeActive(false); // Simulate backspace visually
            timeoutRef.current = setTimeout(() => {
               if (!isMountedRef.current) return;
               // Resume typing interval
               intervalRef.current = setInterval(typeCharacter, TYPING_SPEED_MS);
            }, BACKSPACE_PAUSE_MS);
          }, MISTAKE_PAUSE_MS);

          return prevIndex; // Don't advance index yet
        }
        // --- End Mistake Logic ---

        // Normal typing: advance index
        return prevIndex + 1;
      });
    };

    intervalRef.current = setInterval(typeCharacter, TYPING_SPEED_MS);
  };

  // Fetch random snippet when stage changes to 'fetching'
  useEffect(() => {
    if (stage === 'fetching' && isMountedRef.current) {
      fetch('/api/landing-snippet')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (isMountedRef.current && data && data.text) {
            startAnimationProgress(data.text); // Start animating the new snippet
            setStage('snippet');
          } else {
            console.error("Could not fetch landing snippet or snippet was empty.");
            // Optionally handle error: maybe revert to Honor Code or show static text
          }
        })
        .catch(error => {
          console.error('Error fetching landing snippet:', error);
          // Optionally handle fetch error
        });
    }
  }, [stage]); // Re-run when stage changes

  // Start Honor Code animation on mount
  useEffect(() => {
    isMountedRef.current = true;
    startAnimationProgress(HONOR_CODE);

    // Cleanup function
    return () => {
      isMountedRef.current = false; // Mark as unmounted
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Highlighted Text Generation ---
  const getHighlightedText = useCallback(() => {
    if (!fullText) return null;

    // Similar logic to Typing.jsx's getHighlightedText
    return fullText.split('').map((char, index) => {
      let className = 'landing-future';
      let displayChar = char;

      if (index < charIndex) {
        className = 'landing-correct';
      } else if (index === charIndex) {
        if (mistakeActive) {
          className = 'landing-incorrect'; // Show mistake style
          displayChar = mistakeChar; // Show the wrong character
        } else {
          className = 'landing-current'; // Normal current character
        }
      }

      // Handle spaces specifically if needed for styling
      // if (char === ' ') className += ' space';

      return <span key={index} className={className}>{displayChar}</span>;
    });
  }, [fullText, charIndex]);


  // --- Event Handlers ---
  const handleOpenLeaderboard = () => setIsLeaderboardOpen(true);
  const handleCloseLeaderboard = () => setIsLeaderboardOpen(false);
  const handleLogin = () => login(); // Use the login function from AuthContext

  // --- Render ---
  return (
    <>
      {/* Pass handlers to Navbar */}
      <Navbar
        onOpenLeaderboard={handleOpenLeaderboard}
        onLoginClick={handleLogin}
      />
      <div className="landing-container">
        {/* Two-Column Layout */}
        <div className="landing-main-content">
          {/* Left Column */}
          <div className="landing-left-column">
            <img src={tigerLogo} alt="TigerType Logo" className="landing-logo-large" />
            {/* Add Login button below logo */}
            <button onClick={handleLogin} className="login-button-left">
              Log In
            </button>
            {/* Replace snippet examples with Leaderboard */}
            <div className="leaderboard-container-landing">
              <Leaderboard defaultDuration={15} defaultPeriod="alltime" />
            </div>
          </div>

          {/* Right Column */}
          <div className="landing-right-column">
            <h2>Welcome to TigerType <span className="train-icon">🚂</span></h2>
            <div className="animated-text-container">
              <p className="animated-text">
                {getHighlightedText()}
              </p>
            </div>
            <p className="landing-description-right">
              Improve your typing skills with Princeton-themed challenges! Race against fellow students or practice solo.
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      <Modal
        isOpen={isLeaderboardOpen}
        onClose={handleCloseLeaderboard}
        // title="Leaderboards" // Title is inside Leaderboard component
        isLarge={true}
        showCloseButton={true}
      >
        <Leaderboard />
      </Modal>
    </>
  );
}

export default Landing;