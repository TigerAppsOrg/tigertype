import { useState, useEffect, useRef } from 'react';
import { useRace } from '../context/RaceContext';
import { useSocket } from '../context/SocketContext';
import './Typing.css';

// Typing Tips shown before race countdown start
const TYPING_TIPS = [
  "Keep your wrists neutral and fingers curved",
  "Learn touch typing, using all ten fingers, for faster typing",
  "Learn to look at the screen, not your keyboard",
  "Take regular breaks to avoid strain",
  "Practice regularly to build muscle memory",
  "Correct posture improves typing speed",
  "Don't rush - accuracy is more important than speed",
  "Learn keyboard shortcuts to save time",
  "CTRL + BACKSPACE will delete the entire word",
  "Also try TigerSpot :)",
  "Practicing just 10-minutes of typing daily can significantly improve your speed",
  "Two players are needed to start a race",
  "If you are the last player unreadied, you will be kicked for inactivity",
  "For feedback or suggestions, contact us at: it.admin@tigerapps.org",

  // if any of these tooltips are removed i am resigning and dropping the class - ammaar
  "Hoagie Club is irrelevant and should be restructured",
  "Seriously, Hoagie Club is just a den of rejected TigerApps",
  "Zak Kincaid is an opp"
];

function Typing({ 
  testMode,
  testDuration,
  snippetDifficulty,
  snippetType,
  snippetDepartment
}) {
  const { raceState, setRaceState, typingState, updateProgress, handleInput: raceHandleInput, loadNewSnippet } = useRace();
  const { socket } = useSocket();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastTabPress, setLastTabPress] = useState(0);
  const [snippetId, setSnippetId] = useState(null);
  const [tipIndex, setTipIndex] = useState(Math.floor(Math.random() * TYPING_TIPS.length));
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);
  const [tipVisible, setTipVisible] = useState(true);
  const tipContentRef = useRef(TYPING_TIPS[tipIndex]);
  const [isShaking, setIsShaking] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  
  // Use testMode and testDuration for timed tests if provided
  useEffect(() => {
    if (raceState.type === 'practice' && testMode === 'timed' && testDuration) {
      // Only update if there's a change in mode or duration to avoid unnecessary rerenders
      if (!raceState.timedTest || raceState.timedTest.duration !== testDuration) {
        setRaceState(prev => ({
          ...prev,
          timedTest: {
            enabled: true,
            duration: testDuration,
          }
        }));
      }
    } else if (raceState.type === 'practice' && testMode === 'snippet') {
      // Disable timed test when in snippet mode
      if (raceState.timedTest && raceState.timedTest.enabled) {
        setRaceState(prev => ({
          ...prev,
          timedTest: {
            enabled: false,
            duration: 15,
          }
        }));
      }
    }
  }, [testMode, testDuration, raceState.type, setRaceState, raceState.timedTest]);

  // Use snippet filters if provided
  useEffect(() => {
    if (raceState.type === 'practice' && snippetType && snippetDifficulty) {
      // Update snippet filters in race state
      setRaceState(prev => ({
        ...prev,
        snippetFilters: {
          difficulty: snippetDifficulty || 'all',
          type: snippetType || 'all',
          department: snippetDepartment || 'all'
        }
      }));
    }
  }, [snippetDifficulty, snippetType, snippetDepartment, raceState.type, setRaceState]);
  
  // Rotate through random tips every 5 seconds before race starts
  useEffect(() => {
    if (raceState.type !== 'practice' && !raceState.inProgress && !countdown) {
      const tipInterval = setInterval(() => {
        // Step 1: Hide the current tip
        setTipVisible(false);
        
        // Step 2: After fade out completes, change the content
        setTimeout(() => {
          // Get a new random index (skipping same one again)
          let newIndex;
          do {
            newIndex = Math.floor(Math.random() * TYPING_TIPS.length);
          } while (newIndex === tipIndex);
          
          // Update the tip index
          setTipIndex(newIndex);
          tipContentRef.current = TYPING_TIPS[newIndex];
          
          // Step 3: Show the new tip
          setTipVisible(true);
        }, 600); // Give enough time for fade out to complete
        
      }, 5000);
      
      return () => clearInterval(tipInterval);
    }
  }, [raceState.type, raceState.inProgress, countdown, tipIndex]);
  
  // Update tip content ref when tipIndex changes
  useEffect(() => {
    tipContentRef.current = TYPING_TIPS[tipIndex];
  }, [tipIndex]);
  
  // Handle race countdown
  useEffect(() => {
    if (!socket || raceState.type === 'practice') return;
    
    const handleCountdown = (data) => {
      console.log('Countdown received:', data);
      setCountdown(data.seconds);
      
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    };

    socket.on('race:countdown', handleCountdown);
    
    return () => {
      socket.off('race:countdown', handleCountdown);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [socket, raceState.type, raceState.inProgress, raceState.completed]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Gets latest typingState.position
  const positionRef = useRef(typingState.position);
  useEffect(() => {
    positionRef.current = typingState.position;
  }, [typingState.position]);

  // Track snippet changes to reset input
  useEffect(() => {
    if (raceState.snippet && raceState.snippet.id !== snippetId) {
      setSnippetId(raceState.snippet.id);
      setInput('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [raceState.snippet, snippetId]);

  // Focus input when race starts
  useEffect(() => {
    if ((raceState.inProgress || raceState.type === 'practice') && inputRef.current) {
      inputRef.current.focus();
    }
  }, [raceState.inProgress, raceState.type]);
  
  // Focus input immediately when component mounts in practice mode
  useEffect(() => {
    if (raceState.type === 'practice' && inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle special key combinations like Command+Backspace on Mac
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if race not in progress or input not focused
      if (!raceState.inProgress || !inputRef.current || typingState.completed) return;
      
      // Handle Command+Backspace (Mac) - simulate normal backspace behavior for word locking
      if (e.metaKey && e.key === 'Backspace') {
        e.preventDefault(); // Prevent default to avoid browser/OS handling
        
        // Get current input value
        const currentInput = inputRef.current.value;
        
        // Process what the result would be after Command+Backspace 
        // (typically deletes to beginning of line or current word)
        // We'll just delete  the current word or up to previous space
        const cursorPosition = inputRef.current.selectionStart;
        
        if (cursorPosition > 0) {
          // Find the previous word boundary
          const lastSpace = currentInput.lastIndexOf(' ', cursorPosition - 1);
          let newValue;
          
          if (lastSpace >= 0) {
            // Delete from cursor to after last space
            newValue = currentInput.substring(0, lastSpace + 1) + 
                       currentInput.substring(cursorPosition);
          } else {
            // Delete from cursor to beginning if no space
            newValue = currentInput.substring(cursorPosition);
          }
          
          // Let our existing word locking handle this modified input
          raceHandleInput(newValue);
          setInput(typingState.input);
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [raceState.inProgress, typingState.completed, raceHandleInput, typingState.input]);

  // Prevents the user from unfocusing the input box
  useEffect(() => {
    const handleBodyClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    document.body.addEventListener('click', handleBodyClick);

    return () => {
      document.body.removeEventListener('click', handleBodyClick);
    };
  }, [raceState.inProgress]);

  // Handle keyboard shortcuts for practice mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (raceState.type !== 'practice') return;
      
      // Tab: Load new snippet
      if (e.key === 'Tab') {
        e.preventDefault();
        // Clear input immediately to prevent visual artifacts
        setInput('');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        loadNewSnippet();
      }
      
      // Escape: Restart current snippet
      if (e.key === 'Escape') {
        e.preventDefault();
        // Reset the input and restart the current race
        setInput('');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        setRaceState(prev => ({
          ...prev,
          startTime: null,
          inProgress: false,
          completed: false,
          manuallyStarted: false
        }));
      }
    };

    // Add event listener for capturing all events
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [raceState.type, loadNewSnippet, setRaceState]);

  const getElapsedTime = () =>
    raceState.startTime ? (Date.now() - raceState.startTime) / 1000 : 0;

  // Update elapsed time every ms
  useEffect(() => {
    let interval;
    // Only run the interval if the race is in progress AND not completed
    if (raceState.inProgress && raceState.startTime && !raceState.completed) {
      interval = setInterval(() => {
        setElapsedTime(getElapsedTime());
        
        // For timed tests, check if time is up
        if (raceState.snippet?.is_timed_test && raceState.snippet?.duration) {
          const duration = raceState.snippet.duration;
          const elapsed = getElapsedTime();
          
          // When time is up, mark race as completed
          if (elapsed >= duration && !raceState.completed) {
            console.log('Timed test completed due to time limit');
            
            // Mark as completed locally
            setRaceState(prev => ({
              ...prev,
              completed: true,
              // Store results directly in state
              results: [{
                netid: user?.netid,
                wpm: typingState.wpm,
                accuracy: typingState.accuracy,
                completion_time: elapsed
              }]
            }));
          }
        }
      }, 1); // Update frequently for smoothness
    } else {
      // Clear interval if race stops or is completed
      if (interval) clearInterval(interval);
      // If completed, ensure final time is calculated once? 
      // Results component handles displaying final time
      // If not in progress and not completed, reset to 0
      if (!raceState.inProgress && !raceState.completed) {
         setElapsedTime(0);
      }
    }
  
    return () => {
      clearInterval(interval);
    };
  // Add raceState.completed to dependency array
  }, [raceState.inProgress, raceState.startTime, raceState.completed, raceState.snippet?.is_timed_test, raceState.snippet?.duration, typingState.wpm, typingState.accuracy, user?.netid]);

  // Update WPM continuously - This useEffect might be redundant if WPM is calculated on completion
  // Let's remove this or adjust it. The Results component displays final WPM.
  // We'll keep the continuous WPM display logic but stop it on completion.
  useEffect(() => {
    let interval;
    // Only run interval if in progress and not completed
    if (raceState.inProgress && raceState.startTime && input.length > 0 && !raceState.completed) {
      interval = setInterval(() => {
        // No need to call raceHandleInput here, just update local display WPM if needed
        // Or perhaps remove this continuous WPM calculation entirely if stats bar updates it
      }, 300); 
    } else {
       if (interval) clearInterval(interval); // Clear interval if race stops or completes
    }

    return () => {
      clearInterval(interval);
    };
  // Add raceState.completed to dependency array
  }, [raceState.inProgress, raceState.startTime, input, raceState.completed]);
  
  // Handle typing input with word locking
  const handleComponentInput = (e) => {
    const newInput = e.target.value;
    
    // For practice mode, start the race on first keypress
    if (raceState.type === 'practice' && !raceState.inProgress && !raceState.completed && newInput.length === 1) {
      // Update race state locally for practice mode
      const startTime = Date.now();
      setRaceState(prev => ({
        ...prev,
        startTime: startTime,
        inProgress: true,
        manuallyStarted: true // Set flag to indicate we manually started the race
      }));
      
      // Continue processing this first character instead of ignoring it
      if (raceState.inProgress) {
        raceHandleInput(newInput);
      } else {
        // Since raceState.inProgress hasn't updated yet in this render cycle,
        // we need to directly set the input so the character appears
        setInput(newInput);
        // Schedule an update after the state has changed
        setTimeout(() => raceHandleInput(newInput), 0);
      }
      return;
    }
    
    // Detect errors to trigger shake animation
    if (raceState.inProgress) {
      const text = raceState.snippet?.text || '';
      
      // Prevent typing past the end of the snippet
      if (newInput.length >= text.length + 1) {
        return;
      }
      
      // Check if there's a typing error (improved to check all characters)
      let hasError = false;
      
      // Check for any error in the entire input
      for (let i = 0; i < newInput.length && i < text.length; i++) {
        if (newInput[i] !== text[i]) {
          hasError = true;
          break;
        }
      }
      
      // Only trigger shake and error message on a new error
      if (hasError && !isShaking) {
        setIsShaking(true);
        setShowErrorMessage(true);
        
        // Remove the shake class after animation completes
        setTimeout(() => {
          setIsShaking(false);
        }, 500);
        
        // Hide error message after 750ms (seems to be reasonable time)
        setTimeout(() => {
          setShowErrorMessage(false);
        }, 750);
      }
      
      // Use the handleInput function from RaceContext
      raceHandleInput(newInput);
      
      // Update local input state to match what's in the typing state
      // This ensures the displayed input matches the processed input after word locking
      setInput(typingState.input);
    } else {
      // Prevent typing past the end of the snippet
      if (raceState.snippet && newInput.length > raceState.snippet.text.length) {
        return;
      }
      setInput(newInput);
    }
  }
  
  // Sync input with typingState.input to ensure locked words can't be deleted
  useEffect(() => {
    if (raceState.inProgress) {
      setInput(typingState.input);
    }
  }, [typingState.input, raceState.inProgress]);
  
  // Prevent paste
  const handlePaste = (e) => {
    e.preventDefault();
    return false;
  };
  
  // Generate highlighted text
  const getHighlightedText = () => {
    if (!raceState.snippet) return null;
    
    const text = raceState.snippet.text;
    const components = [];
    let hasEncounteredError = false;
    
    for (let i = 0; i < text.length; i++) {
      if (i < input.length) {
        if (input[i] === text[i] && !hasEncounteredError) {
          components.push(<span key={i} className="correct">{text[i]}</span>);
        } else {
          // Once an error is encountered, mark this and all subsequent typed chars as incorrect
          hasEncounteredError = true;
          components.push(<span key={i} className="incorrect">{text[i]}</span>);
        }
      } else if (i === input.length) {
        components.push(<span key={i} className="current">{text[i]}</span>);
      } else {
        components.push(<span key={i}>{text[i]}</span>);
      }
    }
    
    return components;
  };
    
  // Render stats placeholder (before practice starts)
  const getStatsPlaceholder = () => {
    // Restore original placeholder structure and class name
    return (
      <div className="stats practice-placeholder">
        <div className="stat-item">
          <span className="stat-label">WPM</span>
          <span className="stat-value">--</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value">--</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Time</span>
          <span className="stat-value">0.00s</span>
        </div>
      </div>
    );
  };

  // Render live stats during race
  const getStats = () => {
    // Don't show stats if race is completed 
    //(Results component will show final stats)
    if (raceState.completed) return null;
    
    // Calculate live WPM
    const time = elapsedTime || getElapsedTime();
    const minutes = time / 60;
    const charCount = typingState.position;
    const words = charCount / 5;
    const wpm = minutes > 0 ? words / minutes : 0;
    
    // Use accuracy directly from typingState which is now calculated properly
    const accuracy = typingState.accuracy;
    
    // For timed tests, show time remaining instead of elapsed time
    let timeDisplay;
    if (raceState.snippet?.is_timed_test && raceState.snippet?.duration) {
      const timeRemaining = Math.max(0, raceState.snippet.duration - time);
      timeDisplay = `${timeRemaining.toFixed(2)}s left`;
    } else {
      timeDisplay = `${time.toFixed(2)}s`;
    }
      
    return (
      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">WPM</span>
          <span className="stat-value">{wpm.toFixed(0)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value">{accuracy.toFixed(0)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Time</span>
          <span className="stat-value">{timeDisplay}</span>
        </div>
      </div>
    );
  };
  
  // Render countdown in the stats area
  const getCountdown = () => {
    return (
      <div className="stats countdown-stats">
        <div className="stat-item countdown-item">
          <span className="countdown-value">{countdown}</span>
        </div>
      </div>
    );
  };
  
  // Render tips before race starts
  const getTips = () => {
    return (
      <div className="stats tips-stats">
        <div className="stat-item tip-item">
          <span className={`tip-text ${tipVisible ? 'tip-visible tip-pulsing' : 'tip-hidden'}`}>
            {tipContentRef.current}
          </span>
        </div>
      </div>
    );
  };

  // Render tooltip for keyboard shortcuts in practice mode
  const renderPracticeTooltip = () => {
    // Only show if in practice mode AND not completed
    if (raceState.type !== 'practice' || raceState.completed) return null;

    return (
      <div className="practice-tooltip">
        <div className="tooltip-content">
          <span>Press <kbd>Tab</kbd> for new snippet • <kbd>Esc</kbd> to restart</span>
        </div>
      </div>
    );
  };
  
  // Determine what content to show in the stats container
  const getStatsContent = () => {
    // For practice mode
    if (raceState.type === 'practice') {
      if (!raceState.inProgress) {
        return getStatsPlaceholder();
      } else {
        return getStats();
      }
    } 
    // For race mode
    else {
      if (countdown !== null) {
        return getCountdown();
      } else if (!raceState.inProgress) {
        return getTips();
      } else {
        return getStats();
      }
    }
  };
  
  return (
    <>
    <div className="stats-container">
      {getStatsContent()}
    </div>
    
    {/* Only show typing area (snippet + input) if race is NOT completed */}
    {!raceState.completed && (
        <div className="typing-area">
          <div className={`snippet-display ${isShaking ? 'shake-animation' : ''}`}>
            {showErrorMessage && (
              <div className="error-message">Fix your mistake to continue</div>
            )}
            {getHighlightedText()}
          </div>
          <div className="typing-input-container">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleComponentInput}
              onPaste={handlePaste}
              // Input is disabled based on non-practice conditions OR if practice is completed (but still focusable)
              disabled={(raceState.type !== 'practice' && !raceState.inProgress) || (raceState.type !== 'practice' && typingState.completed)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>
        </div>
    )}

    {/* Tooltip is rendered conditionally inside its function based on completion state */}
    {renderPracticeTooltip()}
    </>
  );
}

export default Typing;