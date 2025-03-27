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
    navigate('/home');
  };
  
  // Render practice mode results
  const renderPracticeResults = () => {
    // First try to find user's result from server results
    const myResult = raceState.results.find(r => r.netid === user?.netid);
    
    // If we have server results, use those
    if (myResult) {
      const rawWpm = myResult.wpm;
      const adjustedWpm = rawWpm * (myResult.accuracy / 100);
      
      return (
        <div className="practice-results">
          <h3>Practice Results</h3>
          
          <div className="stat-item">
            <div className="stat-label">Time Completed:</div>
            <div className="stat-value">{myResult.completion_time?.toFixed(2) || 0}s</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Accuracy:</div>
            <div className="stat-value">{myResult.accuracy?.toFixed(2) || 0}%</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Raw WPM:</div>
            <div className="stat-value">{rawWpm?.toFixed(2) || 0}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Adjusted WPM:</div>
            <div className="stat-value">{adjustedWpm?.toFixed(2) || 0}</div>
          </div>
        </div>
      );
    }
    
    // If no server results, use the typing state for results
    const elapsedSeconds = (Date.now() - raceState.startTime) / 1000;
    const rawWpm = typingState.position > 0 ? Math.round((typingState.position / 5) / (elapsedSeconds / 60)) : 0;
    const adjustedWpm = rawWpm * (typingState.accuracy / 100);
    
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