import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './Landing.css';
import tigerLogo from '../assets/tiger-icon.png'; // Use the simpler icon

const HONOR_CODE = "I pledge my honour that I have not violated the honour code during this examination";
const TYPING_SPEED_MS = 70; // Milliseconds per character
const PAUSE_DURATION_MS = 2000; // Pause between Honor Code and snippet

function Landing() {
  const { login } = useAuth();
  const [displayedText, setDisplayedText] = useState('');
  const [currentText, setCurrentText] = useState(HONOR_CODE);
  const [charIndex, setCharIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [stage, setStage] = useState('honorCode'); // 'honorCode', 'fetching', 'snippet'
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // Function to start the typing animation
  const startTypingAnimation = (textToType) => {
    setCurrentText(textToType);
    setCharIndex(0);
    setDisplayedText('');
    setIsAnimating(true);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setCharIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex > textToType.length) {
          clearInterval(intervalRef.current);
          setIsAnimating(false);
          // Trigger next stage if applicable
          if (stage === 'honorCode') {
            timeoutRef.current = setTimeout(() => {
              setStage('fetching');
            }, PAUSE_DURATION_MS);
          }
          return prevIndex; // Keep index at the end
        }
        setDisplayedText(textToType.substring(0, nextIndex));
        return nextIndex;
      });
    }, TYPING_SPEED_MS);
  };

  // Fetch random snippet when stage changes to 'fetching'
  useEffect(() => {
    if (stage === 'fetching') {
      fetch('/api/landing-snippet')
        .then(res => res.json())
        .then(data => {
          if (data && data.text) {
            startTypingAnimation(data.text);
            setStage('snippet');
          } else {
            // Handle error or no snippet found - maybe just stop?
            console.error("Could not fetch landing snippet or snippet was empty.");
            setIsAnimating(false); // Stop animation if fetch fails
          }
        })
        .catch(error => {
          console.error('Error fetching landing snippet:', error);
          setIsAnimating(false); // Stop animation on error
        });
    }
  }, [stage]);

  // Start Honor Code animation on mount
  useEffect(() => {
    startTypingAnimation(HONOR_CODE);

    // Cleanup function
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-header">
          <img src={tigerLogo} alt="TigerType Logo" className="landing-logo" />
          <h1>TigerType</h1>
        </div>

        {/* Animated Text Area */}
        <div className="animated-text-container">
          <p className="animated-text">
            {displayedText}
            {isAnimating && <span className="cursor">|</span>}
          </p>
        </div>

        <div className="landing-description">
          <p>Improve your typing skills with Princeton-themed challenges!</p>
          <p>Race against fellow students or practice solo.</p>
        </div>

        <button onClick={login} className="login-button">
          Log In with Princeton CAS
        </button>
      </div>

      <div className="landing-footer">
        <a href="#" className="footer-link">About Us</a>
        <span className="footer-separator">|</span>
        <a href="#" className="footer-link">Features</a>
      </div>
    </div>
  );
}

export default Landing;