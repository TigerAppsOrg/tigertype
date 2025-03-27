import { useState, useEffect, useRef } from 'react';
import { useRace } from '../context/RaceContext';
import './Typing.css';

function Typing() {
  const { raceState, typingState, updateProgress } = useRace();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  
  // Focus input when race starts
  useEffect(() => {
    if (raceState.inProgress && inputRef.current) {
      inputRef.current.focus();
    }
  }, [raceState.inProgress]);
  
  // Handle typing input
  const handleInput = (e) => {
    const newInput = e.target.value;
    setInput(newInput);
    
    if (raceState.snippet) {
      updateProgress(newInput, raceState.snippet.text);
    }
  };
  
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
  
  // Get progress bars
  const getProgressBars = () => {
    if (!raceState.players) return null;
    
    return raceState.players.map((player, index) => {
      const progress = player.progress || 0;
      
      return (
        <div key={index} className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          <div className="progress-label">
            {player.netid}: {progress}%
          </div>
        </div>
      );
    });
  };
  
  // Get real-time statistics
  const getStats = () => {
    if (!raceState.startTime) return null;
    
    // Calculate elapsed time
    const elapsed = (Date.now() - raceState.startTime) / 1000;
    const minutes = elapsed / 60;
    
    // Calculate WPM
    const wpm = typingState.position > 0 ? Math.round((typingState.position / 5) / minutes) : 0;
    
    // Calculate accuracy
    const accuracy = typingState.position > 0 
      ? Math.round((typingState.correctChars / typingState.position) * 100) 
      : 100;
    
    return (
      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">WPM:</span>
          <span className="stat-value">{wpm}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Accuracy:</span>
          <span className="stat-value">{accuracy}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Time:</span>
          <span className="stat-value">{elapsed.toFixed(1)}s</span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="typing-area">
      {raceState.inProgress && getStats()}
      
      <div className="snippet-display">
        {getHighlightedText()}
      </div>
      
      <div className="typing-input-container">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInput}
          onPaste={handlePaste}
          disabled={!raceState.inProgress || typingState.completed}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>
      
      <div className="progress-container">
        {getProgressBars()}
      </div>
    </div>
  );
}

export default Typing;