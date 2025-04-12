import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar'; // Import Navbar
import Modal from '../components/Modal'; // Import Modal
import Leaderboard from '../components/Leaderboard'; // Import Leaderboard
import './Landing.css';
import tigerLogo from '../assets/tiger-icon.png'; // Use the simpler icon

const HONOR_CODE = "I pledge my honour that I have not violated the honour code during this examination";
const TYPING_SPEED_MS = 50; // Faster typing speed
const PAUSE_DURATION_MS = 2500; // Longer pause

function Landing() {
  const { login } = useAuth();
  const [fullText, setFullText] = useState(HONOR_CODE); // The complete text to display (Honor Code or snippet)
  const [charIndex, setCharIndex] = useState(0); // Current position in the text
  const [stage, setStage] = useState('honorCode'); // 'honorCode', 'fetching', 'snippet'
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false); // State for modal
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true); // Track mount status for cleanup

  // --- Animation Logic ---

  // Function to start the animation progress for a given text
  const startAnimationProgress = (textToAnimate) => {
    if (!isMountedRef.current) return; // Prevent updates if unmounted

    setFullText(textToAnimate); // Set the full text immediately
    setCharIndex(0); // Reset index

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        clearInterval(intervalRef.current);
        return;
      }
      setCharIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex > textToAnimate.length) {
          clearInterval(intervalRef.current);
          // Trigger next stage after Honor Code completes
          if (stage === 'honorCode') {
             if (timeoutRef.current) clearTimeout(timeoutRef.current); // Clear previous timeout if any
             timeoutRef.current = setTimeout(() => {
               if (isMountedRef.current) setStage('fetching');
             }, PAUSE_DURATION_MS);
          }
          return prevIndex; // Keep index at the end
        }
        return nextIndex;
      });
    }, TYPING_SPEED_MS);
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
      let className = 'landing-future'; // Default: character yet to be typed
      if (index < charIndex) {
        className = 'landing-correct'; // Character correctly typed
      } else if (index === charIndex) {
        className = 'landing-current'; // Current character position
      }
      // Handle spaces specifically if needed for styling (e.g., different background)
      // if (char === ' ') className += ' space';

      return <span key={index} className={className}>{char}</span>;
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
            {/* Placeholder for snippet examples or other content */}
            <div className="snippet-examples">
              <div className="snippet-example-box">[Text snippet example 1]</div>
              <div className="snippet-example-box">[Text snippet example 2]</div>
              <div className="snippet-example-box">[Text snippet example 3]</div>
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