import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import Leaderboard from '../components/Leaderboard';
import './Landing.css';
import tigerLogo from '../assets/tigertype-logo.png';

const HONOR_CODE = "I pledge my honour that I have not violated the honour code during this examination.";
const TYPING_SPEED_MS = 80;
const MISTAKE_CHANCE = 0.06;
const MISTAKE_PAUSE_MS = 400;
const BACKSPACE_SPEED_MS = 60;
const POST_CORRECTION_PAUSE_MS = 250;
const PAUSE_DURATION_MS = 3000;

function Landing() {
  const { login } = useAuth();
  const [fullText, setFullText] = useState(HONOR_CODE);
  const [charIndex, setCharIndex] = useState(0);
  const [stage, setStage] = useState('honorCode');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null); // For stage transitions/pauses
  const isMountedRef = useRef(true);
  const [mistakeActive, setMistakeActive] = useState(false);
  const [mistakeStartIndex, setMistakeStartIndex] = useState(-1);
  const [mistakeEndIndex, setMistakeEndIndex] = useState(-1); // Track the end of the mistake sequence

  // --- Animation Logic ---

  const clearTimersAndIntervals = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  }, []);

  const startAnimationProgress = useCallback((textToAnimate) => {
    if (!isMountedRef.current) return;

    clearTimersAndIntervals();
    setFullText(textToAnimate);
    setCharIndex(0);
    setMistakeActive(false);
    setMistakeStartIndex(-1);
    setMistakeEndIndex(-1);

    const typeCharacter = () => {
      if (!isMountedRef.current) {
        clearTimersAndIntervals();
        return;
      }

      // --- Backspace Logic ---
      if (mistakeActive && charIndex > mistakeStartIndex) {
        // Currently backspacing after a mistake
        setCharIndex(prevIndex => prevIndex - 1);
        return; // Let the backspace interval handle timing
      }
      // --- End Backspace Logic ---


      // --- Normal Typing & Mistake Trigger ---
      setCharIndex((prevIndex) => {
        // End Condition
        if (prevIndex >= textToAnimate.length) {
          clearTimersAndIntervals();
          if (stage === 'honorCode') {
            timeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) setStage('fetching');
            }, PAUSE_DURATION_MS);
          }
          return prevIndex;
        }

        // Mistake Trigger
        if (Math.random() < MISTAKE_CHANCE) {
          clearTimersAndIntervals(); // Stop normal typing
          setMistakeActive(true);
          setMistakeStartIndex(prevIndex);
          const mistakeLength = Math.floor(Math.random() * 5) + 1;
          const targetMistakeEndIndex = Math.min(prevIndex + mistakeLength, textToAnimate.length);
          setMistakeEndIndex(targetMistakeEndIndex);

          // Interval to "type" the mistake (advance index)
          intervalRef.current = setInterval(() => {
            if (!isMountedRef.current) {
              clearTimersAndIntervals();
              return;
            }
            setCharIndex(currentIndex => {
              const nextIndex = currentIndex + 1;
              if (nextIndex >= targetMistakeEndIndex) {
                clearInterval(intervalRef.current); // Stop typing mistakes
                // Pause, then start backspacing
                timeoutRef.current = setTimeout(() => {
                  if (!isMountedRef.current) return;
                  // Start backspacing interval (calls typeCharacter, which now handles backspace logic)
                  intervalRef.current = setInterval(typeCharacter, BACKSPACE_SPEED_MS);
                }, MISTAKE_PAUSE_MS);
              }
              return nextIndex;
            });
          }, TYPING_SPEED_MS);

          return prevIndex; // Initial return before mistake interval takes over
        }

        // Normal Typing
        return prevIndex + 1;
      });
    };

    // Start the initial typing interval
    intervalRef.current = setInterval(typeCharacter, TYPING_SPEED_MS);

  }, [stage, clearTimersAndIntervals]);


   // Fetch random snippet
   useEffect(() => {
    if (stage === 'fetching' && isMountedRef.current) {
       clearTimersAndIntervals();

       fetch('/api/landing-snippet')
         .then(res => {
           if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
           return res.json();
         })
         .then(data => {
           if (isMountedRef.current && data && data.text) {
             startAnimationProgress(data.text);
             setStage('snippet');
           } else {
             console.error("Could not fetch landing snippet or snippet was empty.");
             if (isMountedRef.current) startAnimationProgress(HONOR_CODE); // Fallback
           }
         })
         .catch(error => {
           console.error('Error fetching landing snippet:', error);
           if (isMountedRef.current) startAnimationProgress(HONOR_CODE); // Fallback
         });
    }
  }, [stage, startAnimationProgress, clearTimersAndIntervals]);


  // Start Honor Code animation on mount & cleanup
  useEffect(() => {
    isMountedRef.current = true;
    startAnimationProgress(HONOR_CODE);

    return () => {
      isMountedRef.current = false;
      clearTimersAndIntervals();
    };
  }, [startAnimationProgress, clearTimersAndIntervals]);


  // --- Highlighted Text Generation ---
  const getHighlightedText = useCallback(() => {
    if (!fullText) return null;

    return fullText.split('').map((char, index) => {
      let className = 'landing-future'; // Default: Untyped

      if (mistakeActive && index >= mistakeStartIndex && index < mistakeEndIndex) {
        // Character is within the range affected by the mistake sequence
        // Highlight red only up to the current cursor position during the mistake/backspace phase
        if (index < charIndex) {
            className = 'landing-incorrect';
        }
      } else if (index < charIndex) {
        // Character has been typed correctly
        className = 'landing-correct';
      } else if (index === charIndex && !mistakeActive) {
        // Current cursor position when not making/correcting a mistake
        className = 'landing-current';
      }

      return <span key={index} className={className}>{char}</span>;
    });
  }, [fullText, charIndex, mistakeActive, mistakeStartIndex, mistakeEndIndex]); // Added mistakeEndIndex


  // --- Event Handlers ---
  const handleOpenLeaderboard = () => setIsLeaderboardOpen(true);
  const handleCloseLeaderboard = () => setIsLeaderboardOpen(false);
  const handleLogin = () => login();


  // --- Render ---
  return (
    <>
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
            <button onClick={handleLogin} className="login-button-left">
              Log In
            </button>
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
             <Leaderboard defaultDuration={15} defaultPeriod="alltime" layoutMode="landing" />
        </div>
      </div>

      {/* Leaderboard Modal */}
      <Modal
        isOpen={isLeaderboardOpen}
        onClose={handleCloseLeaderboard}
        isLarge={true}
        showCloseButton={true}
      >
        <Leaderboard defaultDuration={15} defaultPeriod="alltime" layoutMode="modal" />
      </Modal>
    </>
  );
}

export default Landing;