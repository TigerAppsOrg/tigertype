import { useState, useEffect, useRef } from 'react';
import { useRace } from '../context/RaceContext';
import { useSocket } from '../context/SocketContext';
import './Settings.css';
import './Typing.css';

function Typing() {
  const { raceState, setRaceState, typingState, updateProgress, handleInput: raceHandleInput, loadNewSnippet } = useRace();
  const { socket } = useSocket();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastTabPress, setLastTabPress] = useState(0);
  const [snippetId, setSnippetId] = useState(null);

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
  // Modify the unfocusing prevention effect so that you can click on settings,
  // then autofocuses after closing the settings modal or clicking outside of it
  useEffect(() => {
    const handleBodyClick = (e) => {
      const isSettingsClick = e.target.closest('.settings-modal') || 
                            e.target.closest('.settings-icon');

      // Force focus back when clicking close button or outside settings
      if (e.target.closest('.close-button') || 
          (!isSettingsClick && inputRef.current)) {
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
      
      // Tab: Load new snippet (with rate limiting)
      if (e.key === 'Tab') {
        e.preventDefault();
        
        // Rate limit to prevent spamming (1 second cooldown)
        const now = Date.now();
        if (now - lastTabPress > 1000) {
          setLastTabPress(now);
          // Clear input immediately to prevent visual artifacts
          setInput('');
          if (inputRef.current) {
            inputRef.current.value = '';
          }
          loadNewSnippet();
        }
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

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [raceState.type, lastTabPress, loadNewSnippet, setRaceState]);

  const getElapsedTime = () =>
    raceState.startTime ? (Date.now() - raceState.startTime) / 1000 : 0;

  // Update elapsed time every ms
  useEffect(() => {
    let interval;
    if (raceState.inProgress && raceState.startTime) {
      interval = setInterval(() => {
        setElapsedTime(getElapsedTime());
      }, 1);
    } else {
      setElapsedTime(0);
    }
  
    return () => {
      clearInterval(interval);
    };
  }, [raceState.inProgress, raceState.startTime]);

  // Update WPM continuously - using handleInput instead of updateProgress
  useEffect(() => {
    let interval;
    if (raceState.inProgress && raceState.startTime && input.length > 0) {
      interval = setInterval(() => {
        const words = input.length / 5; // Standard word length
        const minutes = getElapsedTime() / 60;
        const wpm = words / minutes;
        raceHandleInput(input); // Use handleInput instead of updateProgress
      }, 300); // Update every 300ms for smoother display
    } else {
      setElapsedTime(0);
    }

    return () => {
      clearInterval(interval);
    };
  }, [raceState.inProgress, raceState.startTime, input, raceHandleInput]);
  
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
    
    // No longer block incorrect characters - allow them to be entered
    // and highlighted as errors in the display
    
    // Use the input after processing by the word locking mechanism
    if (raceState.inProgress) {
      // Use the handleInput function from RaceContext instead of updateProgress
      raceHandleInput(newInput);
      
      // Update local input state to match what's in the typing state
      // This ensures the displayed input matches the processed input after word locking
      setInput(typingState.input);
    } else {
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
    
  // Get real-time statistics
  const getStats = () => {
    return (
      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">WPM:</span>
          <span className="stat-value">{Math.round(typingState.wpm)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Accuracy:</span>
          <span className="stat-value">{Math.round(typingState.accuracy)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Time:</span>
          <span className="stat-value">{elapsedTime.toFixed(2)}s</span>
        </div>
      </div>
    );
  };
  
  // Get placeholder for statistics before typing starts
  const getStatsPlaceholder = () => {
    return (
      <div className="stats">
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

  // Render tooltip for keyboard shortcuts in practice mode
  const renderPracticeTooltip = () => {
    if (raceState.type !== 'practice') return null;

    return (
      <div className="practice-tooltip">
        <div className="tooltip-content">
          <span>Press <kbd>Tab</kbd> for new snippet • <kbd>Esc</kbd> to restart</span>
        </div>
      </div>
    );
  };
  
  return (
    <>
    {raceState.type === 'practice' && !raceState.inProgress ?
      getStatsPlaceholder() :
      (raceState.inProgress && getStats())
    }
    <div className="typing-area">
      
      <div className="snippet-display" >
        {getHighlightedText()}
      </div>
      <div className="typing-input-container">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleComponentInput}
          onPaste={handlePaste}
          disabled={(raceState.type !== 'practice' && !raceState.inProgress) || typingState.completed}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>
    </div>
    {renderPracticeTooltip()}
    </>
  );
}

export default Typing;