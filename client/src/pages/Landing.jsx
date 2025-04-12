import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar'; // Import Navbar
import Modal from '../components/Modal'; // Import Modal
import Leaderboard from '../components/Leaderboard'; // Import Leaderboard
import './Landing.css';
import tigerLogo from '../assets/tigertype-logo.png'; // Use the simpler icon

const HONOR_CODE = "I pledge my honour that I have not violated the honour code during this examination.";
const TYPING_SPEED_MS = 80; // Slightly faster typing
const MISTAKE_CHANCE = 0.05; // 5% chance to start a mistake sequence
const MISTAKE_PAUSE_MS = 300; // Pause after making mistake
const BACKSPACE_PAUSE_MS = 150; // Pause after backspacing
const PAUSE_DURATION_MS = 3000; // Pause between Honor Code and snippet

function Landing() {
  const { login } = useAuth();
  const [fullText, setFullText] = useState(HONOR_CODE);
  const [charIndex, setCharIndex] = useState(0); // Current position in the text
  const [stage, setStage] = useState('honorCode'); // 'honorCode', 'fetching', 'snippet'
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false); // State for modal
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const [mistakeActive, setMistakeActive] = useState(false); // Is a mistake sequence happening?
  const [mistakeStartIndex, setMistakeStartIndex] = useState(-1); // Where the mistake sequence started
  const [currentMistakeChars, setCurrentMistakeChars] = useState([]); // Store the incorrect chars typed
  const mistakeTimeoutRef = useRef(null); // Ref for mistake-related timeouts

// Helper function to get a random character (excluding the correct one)
const getRandomChar = (excludeChar = '') => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'; // Simpler charset for mistakes
  let randomChar;
  do {
    randomChar = chars[Math.floor(Math.random() * chars.length)];
  } while (randomChar === excludeChar);
  return randomChar;
};

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
        // If currently correcting a mistake, just decrement index
        if (mistakeActive && currentMistakeChars.length > 0) {
           // Simulate backspace
           setCurrentMistakeChars(prev => prev.slice(0, -1)); // Remove last mistake char
           if (currentMistakeChars.length === 1) { // Last mistake char removed
             setMistakeActive(false); // End mistake state
             setMistakeStartIndex(-1);
             // Resume normal typing slightly delayed
             mistakeTimeoutRef.current = setTimeout(() => {
                if (intervalRef.current) clearInterval(intervalRef.current); // Clear backspace interval
                intervalRef.current = setInterval(typeCharacter, TYPING_SPEED_MS); // Resume typing
             }, BACKSPACE_PAUSE_MS);
           }
           return prevIndex - 1; // Move index back
        }

        // Check if animation should end
        if (prevIndex >= textToAnimate.length) {
          clearInterval(intervalRef.current);
          if (stage === 'honorCode') {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) setStage('fetching');
            }, PAUSE_DURATION_MS);
          }
          return prevIndex;
        }

        // --- Mistake Trigger Logic ---
        if (!mistakeActive && Math.random() < MISTAKE_CHANCE) {
          clearInterval(intervalRef.current); // Stop normal typing
          setMistakeActive(true);
          setMistakeStartIndex(prevIndex);
          const mistakeLength = Math.floor(Math.random() * 5) + 1; // 1-5 mistakes
          let mistakesTyped = 0;
          let tempMistakeChars = [];

          const typeMistakeSequence = () => {
             if (!isMountedRef.current || mistakesTyped >= mistakeLength) {
                // Finished typing mistakes, start backspacing
                mistakeTimeoutRef.current = setTimeout(() => {
                    if (intervalRef.current) clearInterval(intervalRef.current); // Clear mistake interval
                    intervalRef.current = setInterval(typeCharacter, BACKSPACE_PAUSE_MS); // Start backspacing interval
                }, MISTAKE_PAUSE_MS);
                return;
             }

             const incorrectChar = getRandomChar(textToAnimate[prevIndex + mistakesTyped]);
             tempMistakeChars.push(incorrectChar);
             setCurrentMistakeChars([...tempMistakeChars]); // Update state for rendering
             setCharIndex(prev => prev + 1); // Advance index while making mistakes
             mistakesTyped++;
             mistakeTimeoutRef.current = setTimeout(typeMistakeSequence, TYPING_SPEED_MS); // Continue mistake sequence
          };

          mistakeTimeoutRef.current = setTimeout(typeMistakeSequence, MISTAKE_PAUSE_MS); // Start mistake sequence after pause
          return prevIndex; // Return current index, mistake sequence handles advancement
        }
        // --- End Mistake Trigger Logic ---

        // Normal typing: advance index
        return prevIndex + 1;
      });
    };

    intervalRef.current = setInterval(typeCharacter, TYPING_SPEED_MS);
  };


  // Fetch random snippet when stage changes to 'fetching'
  useEffect(() => {
    if (stage === 'fetching' && isMountedRef.current) {
       // Clear any mistake timeouts before fetching
       if (mistakeTimeoutRef.current) clearTimeout(mistakeTimeoutRef.current);
       if (intervalRef.current) clearInterval(intervalRef.current); // Stop any ongoing animation

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
             // Fallback: restart Honor Code animation if fetch fails
             if (isMountedRef.current) startAnimationProgress(HONOR_CODE);
           }
         })
         .catch(error => {
           console.error('Error fetching landing snippet:', error);
            // Fallback: restart Honor Code animation on error
           if (isMountedRef.current) startAnimationProgress(HONOR_CODE);
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
      if (mistakeTimeoutRef.current) clearTimeout(mistakeTimeoutRef.current); // Clear mistake timeouts too
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Highlighted Text Generation ---
  const getHighlightedText = useCallback(() => {
    if (!fullText) return null;

    return fullText.split('').map((char, index) => {
      let className = 'landing-future';
      let displayChar = char;

      if (mistakeActive && index >= mistakeStartIndex && index < mistakeStartIndex + currentMistakeChars.length) {
        // Part of the currently displayed mistake sequence
        className = 'landing-incorrect';
        // Display the incorrect character that was typed for this position in the sequence
        displayChar = currentMistakeChars[index - mistakeStartIndex];
      } else if (index < charIndex && (!mistakeActive || index < mistakeStartIndex)) {
         // Correctly typed characters before any active mistake OR characters before the backspace point
         className = 'landing-correct';
      } else if (index === charIndex && !mistakeActive) {
         // Current cursor position (not making a mistake)
         className = 'landing-current';
      }
      // else: it remains 'landing-future'

      return <span key={index} className={className}>{displayChar}</span>;
    });
  }, [fullText, charIndex, mistakeActive, mistakeStartIndex, currentMistakeChars]); // Add mistake states to dependencies


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
            {/* Leaderboard removed from left column */}
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
        {/* Leaderboard Section Below Main Content */}
        <div className="leaderboard-section-landing">
             <h2>Leaderboards</h2>
             <Leaderboard defaultDuration={15} defaultPeriod="alltime" />
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