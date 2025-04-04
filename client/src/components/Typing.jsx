import { useState, useEffect, useRef } from 'react';
import { useRace } from '../context/RaceContext';
import { useSocket } from '../context/SocketContext';
import './Typing.css';

function Typing() {
  const { raceState, setRaceState, typingState, updateProgress } = useRace();
  const { socket } = useSocket();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Gets latest typingState.position
  const positionRef = useRef(typingState.position);
  useEffect(() => {
    positionRef.current = typingState.position;
  }, [typingState.position]);

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

  // Prevents the user from unfocusing the input box
  useEffect(() => {
    document.body.addEventListener('click', () => {
      inputRef.current.focus();
    })
  }, [raceState.inProgress])

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

  // Update WPM continuously
  useEffect(() => {
  let interval;
  if (raceState.inProgress && raceState.startTime) {
    interval = setInterval(() => {
      if (input.length > 0) {
        const words = input.length / 5; // Standard word length
        const minutes = getElapsedTime() / 60;
        const wpm = words / minutes;
        updateProgress(input); // This will update the WPM in race state
      }
    }, 300); // Update every 100ms for smoother display
  } else {
    setElapsedTime(0);
  }

  return () => {
    clearInterval(interval);
  };
}, [raceState.inProgress, raceState.startTime, input]);
  
  // Handle typing input
  const handleInput = (e) => {
    const newInput = e.target.value;
    
    // For practice mode, start the race on first keypress
    if (raceState.type === 'practice' && !raceState.inProgress && !raceState.completed && newInput.length === 1) {
      // Update race state locally for practice mode
      const startTime = Date.now();
      setRaceState(prev => ({
        ...prev,
        startTime: startTime,
        inProgress: true
      }));
      
      // Emit race:start event to start the race
      if (socket) {
        socket.emit('race:start', { code: raceState.code });
      }
    }
    
    // For multiplayer races, require 100% accuracy
    if (raceState.type !== 'practice' && raceState.inProgress) {
      const text = raceState.snippet.text;
      // Only allow input if it matches the text exactly up to the current position
      if (newInput.length > input.length) {
        // Check if the new character matches
        const newChar = newInput[newInput.length - 1];
        const expectedChar = text[newInput.length - 1];
        if (newChar !== expectedChar) {
          // If it doesn't match, don't update the input
          return;
        }
      }
    }
    
    setInput(newInput);
    
    if (raceState.inProgress) {
      updateProgress(newInput);
    }
  }
  
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
    
    for (let i = 0; i < text.length; i++) {
      if (i < input.length) {
        if (input[i] === text[i]) {
          components.push(<span key={i} className="correct">{text[i]}</span>);
        } else {
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
    if (!raceState.startTime) return null;
    
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
  
  return (
    <>
    {raceState.inProgress && getStats()}
    <div className="typing-area">
      
      <div className="snippet-display" >
        {getHighlightedText()}
      </div>
      <div className="typing-input-container">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInput}
          onPaste={handlePaste}
          disabled={(raceState.type !== 'practice' && !raceState.inProgress) || typingState.completed}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>
    </div>
    </>
  );
}

export default Typing;