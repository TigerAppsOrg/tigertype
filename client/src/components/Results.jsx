import { useNavigate } from 'react-router-dom';
import { useRace } from '../context/RaceContext';
import { useAuth } from '../context/AuthContext';
import './Results.css';

function Results() {
  const navigate = useNavigate();
  const { raceState, typingState, resetRace } = useRace();
  const { user } = useAuth();
  
  // Handle back button
  const handleBack = () => {
    resetRace();
    navigate('/home?refreshUser=true');
  };
  
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
    return (
      <>
        <h3>Race Results</h3>
        <div className="results-list">
          {raceState.results.map((result, index) => (
            <div 
              key={index} 
              className={`result-item ${result.netid === user?.netid ? 'current-user' : ''}`}
            >
              <div className="result-rank">#{index + 1}</div>
              <div className="result-netid">{result.netid}</div>
              <div className="result-wpm">{result.wpm?.toFixed(2) || 0} WPM</div>
              <div className="result-accuracy">{result.accuracy?.toFixed(2) || 0}%</div>
              <div className="result-time">{result.completion_time?.toFixed(2) || 0}s</div>
            </div>
          ))}
        </div>
      </>
    );
  };
  
  return (
    <div className="results-container">
      <h2>Results</h2>
      
      {raceState.type === 'practice' ? renderPracticeResults() : renderRaceResults()}
      
      <button className="back-btn" onClick={handleBack}>
        Back to Menu
      </button>
    </div>
  );
}

export default Results;