import { useNavigate } from 'react-router-dom';
import { useRace } from '../context/RaceContext';
import { useAuth } from '../context/AuthContext';
import { useState, useCallback, useEffect } from 'react';
import { useTutorial } from '../context/TutorialContext';
import TutorialAnchor from './TutorialAnchor';
import './Results.css';
import axios from 'axios';
import defaultProfileImage from '../assets/icons/default-profile.svg';
import PropTypes from 'prop-types';
import ProfileModal from './ProfileModal.jsx';

function Results({ onShowLeaderboard }) {
  const navigate = useNavigate();
  const { raceState, typingState, resetRace, joinPublicRace } = useRace();
  const { isRunning, endTutorial } = useTutorial();
  const { user } = useAuth();
  // State for profile modal
  const [selectedProfileNetid, setSelectedProfileNetid] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  // State for storing fetched titles for result players
  const [resultTitlesMap, setResultTitlesMap] = useState({});
  
  // --- DEBUG LOG --- 
  useEffect(() => {
    console.log('[Results Component Render] raceState.snippet:', raceState.snippet);
  }, [raceState.snippet]);
  // --- END DEBUG LOG --- 
  
  // Fetch titles for each player in race results
  useEffect(() => {
    if (raceState.results && raceState.results.length) {
      raceState.results.forEach(result => {
        const netid = result.netid;
        // Use current user's titles from context
        if (netid === user?.netid && user?.titles && !(netid in resultTitlesMap)) {
          setResultTitlesMap(prev => ({ ...prev, [netid]: user.titles }));
        }
        // Fetch other players' titles
        if (netid !== user?.netid && !(netid in resultTitlesMap)) {
          axios.get(`/api/user/${netid}/titles`)
            .then(res => setResultTitlesMap(prev => ({ ...prev, [netid]: res.data || [] })))
            .catch(err => {
              console.error(`Error fetching titles for ${netid}:`, err);
              setResultTitlesMap(prev => ({ ...prev, [netid]: [] }));
            });
        }
      });
    }
  }, [raceState.results, user, resultTitlesMap]);
  
  // Handle back button
  const handleBack = () => {
    if (isRunning) endTutorial();
    resetRace();
    navigate('/home?refreshUser=true');
  };
  
  // Handle avatar click to show profile modal
  const handleAvatarClick = (_avatar, netid) => {
    setSelectedProfileNetid(netid);
    setShowProfileModal(true);
    document.body.style.overflow = 'hidden';
  };
  
  // Close profile modal
  const closeModal = useCallback(() => {
    setShowProfileModal(false);
    setSelectedProfileNetid(null);
    document.body.style.overflow = '';
  }, []);
  
  // Add handler to queue another public race
  const handleQueueNext = () => {
    resetRace();
    joinPublicRace();
  };
  
  // Render practice mode results
  const renderPracticeResults = () => {
    // Function to render the main stats block
    const renderStatsBlock = (wpm, accuracy, time) => {
      const rawWpm = wpm;
      const adjustedWpm = rawWpm * (accuracy / 100);
      return (
        <>
          <div className="stat-item">
            <div className="stat-label">
              <i className="bi bi-clock"></i>
              Time Completed:
            </div>
            <div className="stat-value">{time?.toFixed(2)}s</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">
              <i className="bi bi-check-circle"></i>
              Accuracy:
            </div>
            <div className="stat-value">{accuracy?.toFixed(2)}%</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">
              <i className="bi bi-speedometer"></i>
              Raw WPM:
            </div>
            <div className="stat-value">{rawWpm?.toFixed(2)}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">
              <i className="bi bi-lightning"></i>
              Adjusted WPM:
            </div>
            <div className="stat-value highlight">{adjustedWpm?.toFixed(2)}</div>
          </div>
        </>
      );
    };
    
    // Determine which data source to use
    let statsContent;
    const resultFromState = raceState.results?.[0];

    if (resultFromState) {
      statsContent = renderStatsBlock(
        resultFromState.wpm,
        resultFromState.accuracy,
        resultFromState.completion_time
      );
    } else if (typingState.completed && raceState.startTime) { // Make sure startTime exists
      const elapsedSeconds = (Date.now() - raceState.startTime) / 1000;
      statsContent = renderStatsBlock(
        typingState.wpm,
        typingState.accuracy,
        elapsedSeconds
      );
    } else {
      statsContent = (
        <div className="loading-results">
          <div className="spinner-border text-orange" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Waiting for results...</p>
        </div>
      );
    }

    return (
      <TutorialAnchor anchorId="practice-results">
        <div className="practice-results">
        <h3>Practice Results</h3>
        {statsContent}
        {/* Snippet Source Info */}
        {raceState.snippet && (
          <div className="snippet-info">
            Where is this excerpt from?{' '}
            <strong>{raceState.snippet.course_name || raceState.snippet.source || 'Unknown Source'}</strong>
          </div>
        )}
        {/* Course Review Button */}
        {raceState.snippet?.princeton_course_url && (
          <a
            href={raceState.snippet.princeton_course_url}
            className="course-review-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-book"></i>
            View Course Review
          </a>
        )}
        <TutorialAnchor anchorId="keyboard-shortcuts">
          <div className="keyboard-shortcuts">
            <p>Press <kbd>Tab</kbd> for a new excerpt • <kbd>Esc</kbd> to restart</p>
          </div>
        </TutorialAnchor>
        {/* Conditionally add Leaderboard Button */} 
        {onShowLeaderboard && (
          <TutorialAnchor anchorId="finish-practice">
            <button className="leaderboard-shortcut-btn" onClick={onShowLeaderboard}>
              <i className="bi bi-trophy"></i> View Leaderboards
            </button>
          </TutorialAnchor>
        )}
        </div>
      </TutorialAnchor>
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
              onError={(e) => { e.target.onerror = null; e.target.src=defaultProfileImage; }}
            />
          </div>
          <div className="winner-details">
            <div className="winner-header">
              <div className="winner-trophy"><i className="bi bi-trophy"></i></div>
              <div className="winner-netid">{winner.netid}</div>
            </div>
            {/* Display titles for winner */}
            {resultTitlesMap[winner.netid]?.[0] && (
              <div className="winner-titles">
                <span className="winner-title-badge">
                  {resultTitlesMap[winner.netid][0].name}
                </span>
              </div>
            )}
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
                    onError={(e) => { e.target.onerror = null; e.target.src=defaultProfileImage; }}
                  />
                </div>
                <div className="result-text">
                  <div className="result-netid">{result.netid}</div>
                  {resultTitlesMap[result.netid]?.[0] && (
                    <div className="result-titles">
                      <span className="result-title-badge">
                        {resultTitlesMap[result.netid][0].name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="result-stats">
                <div className="result-wpm">{result.wpm?.toFixed(2) || 0} WPM</div>
                <div className="result-accuracy">{result.accuracy?.toFixed(2) || 0}%</div>
                <div className="result-time">{result.completion_time?.toFixed(2) || 0}s</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Snippet Source Info */}
        {raceState.snippet && (
          <div className="snippet-info">
            Where is this excerpt from?{' '}
            <strong>{raceState.snippet.course_name || raceState.snippet.source || 'Unknown Source'}</strong>
          </div>
        )}
        {/* Course Review Button for multiplayer results */}
        {raceState.snippet?.princeton_course_url && (
          <a
            href={raceState.snippet.princeton_course_url}
            className="course-review-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-book"></i>
            View Course Review
          </a>
        )}
      </>
    );
  };
  
  return (
    <>
      <div className="results-container">
        <h2>Results</h2>
        
        {raceState.type === 'practice' ? renderPracticeResults() : renderRaceResults()}
        
        {/* Queue Next Race button for quick matches */}
        {raceState.type === 'public' && (
          <button className="back-btn" onClick={handleQueueNext}>
            Queue Another Race
          </button>
        )}
        
        <button className="back-btn back-to-menu-btn" onClick={handleBack}>
          Back to Menu
        </button>
      </div>
      
      {/* Profile Modal for viewing user profiles */}
      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={closeModal}
          netid={selectedProfileNetid}
        />
      )}
    </>
  );
}

Results.propTypes = {
  onShowLeaderboard: PropTypes.func, // Prop is optional
};

export default Results;