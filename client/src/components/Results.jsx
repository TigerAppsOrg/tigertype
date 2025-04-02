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
    // Always try to find the user's result from the server results received via raceState
    const myResult = raceState.results?.find(r => r.netid === user?.netid);
    
    // If we have server results for the current user, display them
    if (myResult) {
      const rawWpm = myResult.wpm;
      // Calculate adjusted WPM based on server data
      const adjustedWpm = rawWpm * (myResult.accuracy / 100);
      
      return (
        <div className="practice-results">
          <h3>Practice Results</h3>
          
          <div className="stat-item">
            <div className="stat-label">Time Completed:</div>
            {/* Use optional chaining and provide default value */}
            <div className="stat-value">{myResult.completion_time?.toFixed(2) || 'N/A'}s</div> 
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Accuracy:</div>
            {/* Use optional chaining and provide default value */}
            <div className="stat-value">{myResult.accuracy?.toFixed(2) || 'N/A'}%</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Raw WPM:</div>
            {/* Use optional chaining and provide default value */}
            <div className="stat-value">{rawWpm?.toFixed(2) || 'N/A'}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Adjusted WPM:</div>
            {/* Use optional chaining and provide default value */}
            <div className="stat-value">{adjustedWpm?.toFixed(2) || 'N/A'}</div>
          </div>
        </div>
      );
    } else {
      // If no result found for the user in raceState.results, display a message
      // instead of attempting client-side calculation.
      return (
        <div className="practice-results">
          <h3>Practice Results</h3>
          <p>Waiting for results or results not available...</p>
          {/* Optionally show raw typing state for debugging if needed, but not as primary result */}
          {/* <p>(Debug: Local WPM: {typingState.wpm.toFixed(2)}, Accuracy: {typingState.accuracy.toFixed(2)}%)</p> */}
        </div>
      );
    }
    
    // Removed fallback logic that calculated results using typingState
    // const elapsedSeconds = (Date.now() - raceState.startTime) / 1000;
    // const rawWpm = typingState.position > 0 ? Math.round((typingState.position / 5) / (elapsedSeconds / 60)) : 0;
    // const adjustedWpm = rawWpm * (typingState.accuracy / 100);
    // 
    // return (
    //   <div className="practice-results">
    //     <h3>Practice Results</h3>
    //     {/* ... stats using local calculations ... */}
    //   </div>
    // );
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