import { useNavigate } from 'react-router-dom';
import { useRace } from '../context/RaceContext';
import { useAuth } from '../context/AuthContext';
import { useState, useCallback, useEffect } from 'react';
import './Results.css';
// Import default profile image
import defaultProfileImage from '../assets/default-profile.svg';

function Results() {
  const navigate = useNavigate();
  const { raceState, typingState, resetRace } = useRace();
  const { user } = useAuth();
  const [enlargedAvatar, setEnlargedAvatar] = useState(null);
  
  // Handle back button
  const handleBack = () => {
    resetRace();
    navigate('/home?refreshUser=true');
  };
  
  // Handle avatar click
  const handleAvatarClick = (avatar, netid) => {
    setEnlargedAvatar({ url: avatar || defaultProfileImage, netid });
    document.body.style.overflow = 'hidden';
  };
  
  // Close modal
  const closeModal = useCallback(() => {
    setEnlargedAvatar(null);
    document.body.style.overflow = '';
  }, []);
  
  // Close modal when clicking overlay
  const closeEnlargedAvatar = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };
  
  // Handle escape key press
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && enlargedAvatar) {
        closeModal();
      }
    };
    
    if (enlargedAvatar) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [enlargedAvatar, closeModal]);
  
  // Render practice mode results
  const renderPracticeResults = () => {
    // First try to get results from raceState
    const result = raceState.results?.[0];
    
    if (result) {
      const rawWpm = result.wpm;
      const adjustedWpm = rawWpm * (result.accuracy / 100);
      
      return (
        <div className="practice-results">
          <h3>Practice Results</h3>
          
          <div className="stat-item">
            <div className="stat-label">Time Completed:</div>
            <div className="stat-value">{result.completion_time?.toFixed(2)}s</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Accuracy:</div>
            <div className="stat-value">{result.accuracy?.toFixed(2)}%</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Raw WPM:</div>
            <div className="stat-value">{rawWpm?.toFixed(2)}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Adjusted WPM:</div>
            <div className="stat-value">{adjustedWpm?.toFixed(2)}</div>
          </div>

          <div className="keyboard-shortcuts">
            <p>Press <kbd>Tab</kbd> for a new excerpt • <kbd>Esc</kbd> to restart</p>
          </div>
        </div>
      );
    }
    
    // If no results in state yet but typing is completed, use typing state
    if (typingState.completed) {
      const rawWpm = typingState.wpm;
      const adjustedWpm = rawWpm * (typingState.accuracy / 100);
      const elapsedSeconds = (Date.now() - raceState.startTime) / 1000;
      
      return (
        <div className="practice-results">
          <h3>Practice Results</h3>
          
          <div className="stat-item">
            <div className="stat-label">Time Completed:</div>
            <div className="stat-value">{elapsedSeconds.toFixed(2)}s</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Accuracy:</div>
            <div className="stat-value">{typingState.accuracy.toFixed(2)}%</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Raw WPM:</div>
            <div className="stat-value">{rawWpm.toFixed(2)}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Adjusted WPM:</div>
            <div className="stat-value">{adjustedWpm.toFixed(2)}</div>
          </div>

          <div className="keyboard-shortcuts">
            <p>Press <kbd>Tab</kbd> for a new excerpt • <kbd>Esc</kbd> to restart</p>
          </div>
        </div>
      );
    }
    
    // If no results yet
    return (
      <div className="practice-results">
        <h3>Practice Results</h3>
        <p>Waiting for results or results not available...</p>
      </div>
    );
  };
  
  // Render multiplayer race results
  const renderRaceResults = () => {
    if (!raceState.results || raceState.results.length === 0) {
      return (
        <p>Waiting for results...</p>
      );
    }
    
    // Get the first place result (winner)
    const winner = raceState.results[0];
    const otherResults = raceState.results.slice(1);
    
    return (
      <>
        {/* First place winner with large avatar */}
        <div className="winner-showcase">
          <div 
            className="winner-avatar" 
            onClick={() => handleAvatarClick(winner.avatar_url, winner.netid)}
            title="Click to enlarge"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleAvatarClick(winner.avatar_url, winner.netid);
                e.preventDefault();
              }
            }}
          >
            <img 
              src={winner.avatar_url || defaultProfileImage} 
              alt={`${winner.netid}'s avatar`}
            />
          </div>
          <div className="winner-details">
            <div className="winner-header">
              <div className="winner-trophy"><i className="bi bi-trophy"></i></div>
              <div className="winner-netid">{winner.netid}</div>
            </div>
            <div className="winner-stats">
              <div className="winner-wpm">{winner.wpm?.toFixed(2) || 0} WPM</div>
              <div className="winner-accuracy">{winner.accuracy?.toFixed(2) || 0}% accuracy</div>
              <div className="winner-time">{winner.completion_time?.toFixed(2) || 0}s</div>
            </div>
          </div>
        </div>
        
        {/* Other results */}
        <div className="results-list">
          {otherResults.map((result, index) => (
            <div 
              key={index} 
              className={`result-item ${result.netid === user?.netid ? 'current-user' : ''}`}
            >
              <div className="result-rank">#{index + 2}</div>
              <div className="result-player">
                <div 
                  className="result-avatar"
                  onClick={() => handleAvatarClick(result.avatar_url, result.netid)}
                  title="Click to enlarge"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleAvatarClick(result.avatar_url, result.netid);
                      e.preventDefault();
                    }
                  }}
                >
                  <img 
                    src={result.avatar_url || defaultProfileImage} 
                    alt={`${result.netid}'s avatar`}
                  />
                </div>
                <div className="result-netid">{result.netid}</div>
              </div>
              <div className="result-stats">
                <div className="result-wpm">{result.wpm?.toFixed(2) || 0} WPM</div>
                <div className="result-accuracy">{result.accuracy?.toFixed(2) || 0}%</div>
                <div className="result-time">{result.completion_time?.toFixed(2) || 0}s</div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };
  
  return (
    <>
      <div className="results-container">
        <h2>Results</h2>
        
        {raceState.type === 'practice' ? renderPracticeResults() : renderRaceResults()}
        
        <button className="back-btn" onClick={handleBack}>
          Back to Menu
        </button>
      </div>
      
      {/* Enlarged Avatar Modal */}
      {enlargedAvatar && (
        <div 
          className="avatar-modal-overlay" 
          onClick={closeEnlargedAvatar}
          role="dialog"
          aria-modal="true"
          aria-label={`${enlargedAvatar.netid}'s avatar`}
        >
          <div className="avatar-modal">
            <button 
              className="avatar-modal-close" 
              onClick={closeModal}
              aria-label="Close avatar view"
            >
              ×
            </button>
            <div className="avatar-modal-content">
              <img 
                src={enlargedAvatar.url} 
                alt={`${enlargedAvatar.netid}'s avatar`} 
                className="avatar-modal-image"
              />
              <div className="avatar-modal-name">{enlargedAvatar.netid}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Results;