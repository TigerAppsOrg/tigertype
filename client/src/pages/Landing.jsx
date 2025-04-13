import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import Leaderboard from '../components/Leaderboard';
import StatsShowcase from '../components/StatsShowcase';
import './Landing.css';
import tigerLogo from '../assets/tigertype-logo.png';

const HONOR_CODE = "I pledge my honour that I have not violated the honour code during this examination.";
const TYPING_SPEED_MS = 80;
const MISTAKE_CHANCE = 0.2;
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
  const intervalRef = useRef(null); // Holds the main typing/mistake/backspace interval
  const timeoutRef = useRef(null); // Holds stage transition/pause timeouts
  const isMountedRef = useRef(true);
  const [isMistakeCorrectionPhase, setIsMistakeCorrectionPhase] = useState(false); // Tracks if we are currently correcting (typing mistake + backspacing)
  const [mistakeStartIndex, setMistakeStartIndex] = useState(-1);
  const [mistakeEndIndex, setMistakeEndIndex] = useState(-1);

  // --- Animation Logic ---

  const clearTimersAndIntervals = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
    // console.log("Cleared timers/intervals"); // Debug log
  }, []);

  const startAnimationProgress = useCallback((textToAnimate) => {
    if (!isMountedRef.current) return;
    // console.log("Starting animation for:", textToAnimate.substring(0, 10) + "..."); // Debug log

    clearTimersAndIntervals();
    setFullText(textToAnimate);
    setCharIndex(0);
    setIsMistakeCorrectionPhase(false);
    setMistakeStartIndex(-1);
    setMistakeEndIndex(-1);

    const performTypingStep = () => {
      if (!isMountedRef.current) {
        clearTimersAndIntervals();
        return;
      }

      setCharIndex((prevIndex) => {
        // --- End Condition ---
        if (prevIndex >= textToAnimate.length) {
          clearTimersAndIntervals();
          if (stage === 'honorCode') {
            // console.log("Honor code finished, setting timeout for fetch"); // Debug log
            timeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) setStage('fetching');
            }, PAUSE_DURATION_MS);
          }
          return prevIndex;
        }

        // --- Mistake Trigger ---
        if (Math.random() < MISTAKE_CHANCE) {
          // console.log(`Mistake triggered at index ${prevIndex}`); // Debug log
          clearTimersAndIntervals(); // Stop normal typing
          setIsMistakeCorrectionPhase(true); // Enter mistake phase
          const mistakeStart = prevIndex;
          const mistakeLength = Math.floor(Math.random() * 5) + 1;
          const targetMistakeEndIndex = Math.min(mistakeStart + mistakeLength, textToAnimate.length);
          setMistakeStartIndex(mistakeStart);
          setMistakeEndIndex(targetMistakeEndIndex);

          let mistakesTyped = 0;
          let currentMistakeIndex = mistakeStart;

          // Interval to "type" the mistake (advance index)
          intervalRef.current = setInterval(() => {
            if (!isMountedRef.current) { clearTimersAndIntervals(); return; }

            currentMistakeIndex++;
            mistakesTyped++;
            setCharIndex(currentMistakeIndex); // Update visual cursor

            if (currentMistakeIndex >= targetMistakeEndIndex || mistakesTyped >= mistakeLength) {
              clearInterval(intervalRef.current); // Stop typing mistakes
              // console.log(`Finished typing mistake sequence (length ${mistakesTyped})`); // Debug log
              // Pause, then start backspacing
              timeoutRef.current = setTimeout(() => {
                if (!isMountedRef.current) return;
                // console.log("Starting backspace..."); // Debug log
                // Start backspacing interval
                intervalRef.current = setInterval(() => {
                  if (!isMountedRef.current) { clearTimersAndIntervals(); return; }
                  setCharIndex(currentIndexBackspace => {
                    const nextBackspaceIndex = currentIndexBackspace - 1;
                    // console.log(`Backspacing: ${currentIndexBackspace} -> ${nextBackspaceIndex}`); // Debug log
                    if (nextBackspaceIndex < mistakeStart) { // Finished backspacing
                      // console.log("Finished backspacing"); // Debug log
                      clearTimersAndIntervals();
                      setIsMistakeCorrectionPhase(false); // Exit mistake phase
                      setMistakeStartIndex(-1);
                      setMistakeEndIndex(-1);
                      // Pause slightly before resuming normal typing
                      timeoutRef.current = setTimeout(() => {
                         if (isMountedRef.current) {
                            // console.log("Resuming normal typing"); // Debug log
                            intervalRef.current = setInterval(performTypingStep, TYPING_SPEED_MS); // Resume normal typing
                         }
                      }, POST_CORRECTION_PAUSE_MS);
                      return mistakeStart; // Ensure index is correct
                    }
                    return nextBackspaceIndex; // Decrement index
                  });
                }, BACKSPACE_SPEED_MS);
              }, MISTAKE_PAUSE_MS);
            }
          }, TYPING_SPEED_MS);

          return prevIndex; // Return current index initially
        }
        // --- End Mistake Trigger ---

        // Normal Typing
        // console.log(`Normal typing: ${prevIndex} -> ${prevIndex + 1}`); // Debug log
        return prevIndex + 1;
      });
    };

    // Start the initial typing interval
    intervalRef.current = setInterval(performTypingStep, TYPING_SPEED_MS);

  }, [stage, clearTimersAndIntervals]);


   // Fetch random snippet
   useEffect(() => {
    if (stage === 'fetching' && isMountedRef.current) {
       // console.log("Fetching new snippet..."); // Debug log
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

      if (isMistakeCorrectionPhase && index >= mistakeStartIndex && index < mistakeEndIndex) {
        // Character is within the range affected by the mistake sequence
        // Highlight red only up to the current cursor position during the mistake/backspace phase
        if (index < charIndex) {
            className = 'landing-incorrect';
        }
        // Characters within the mistake range but *after* the current backspace cursor remain future
      } else if (index < charIndex) {
        // Character has been typed correctly
        className = 'landing-correct';
      } else if (index === charIndex && !isMistakeCorrectionPhase) {
        // Current cursor position when not making/correcting a mistake
        className = 'landing-current';
      }

      return <span key={index} className={className}>{char}</span>;
    });
  }, [fullText, charIndex, isMistakeCorrectionPhase, mistakeStartIndex, mistakeEndIndex]); // Use isMistakeCorrectionPhase


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

        {/* Combined Data Section */}
        <div className="landing-data-section">
          {/* Statistics Showcase */}
          <div className="landing-stats-container">
            <StatsShowcase />
          </div>
          
          {/* Leaderboard Section */}
          <div className="landing-leaderboard-container">
            <Leaderboard defaultDuration={15} defaultPeriod="alltime" layoutMode="landing" />
          </div>
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