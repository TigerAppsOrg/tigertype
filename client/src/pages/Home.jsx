import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRace } from '../context/RaceContext';
import Typing from '../components/Typing';
import Results from '../components/Results';
import './Race.css';

function Race() {
  const navigate = useNavigate();
  const { 
    raceState, 
    typingState,
    setPlayerReady, 
    resetRace 
  } = useRace();
  
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);
  
  // Handle race countdown
  useEffect(() => {
    const socket = window.socket;
    if (!socket) return;
    
    const handleCountdown = (data) => {
      setCountdown(data.seconds);
      
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
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
      }
    };
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);
  
  // Handle back button
  const handleBack = () => {
    resetRace();
    navigate('/home');
  };
  
  return (
    <div className="race-page">
      <div className="race-container">
        <div className="back-button-container">
          <button className="back-button" onClick={handleBack}>
            <span>⟵</span> Back
          </button>
        </div>
        
        <div className="race-content">
          <div className="race-info">
            <h2>{raceState.type === 'practice' ? 'Practice Mode' : 'Race'}</h2>
            
            {raceState.code && (
              <div className="lobby-code">Lobby Code: {raceState.code}</div>
            )}
            
            {raceState.players && raceState.players.length > 0 && (
              <div className="players-list">
                <h3>Players:</h3>
                <div className="players-grid">
                  {raceState.players.map((player, index) => (
                    <div 
                      key={index} 
                      className={`player-item ${player.ready ? 'player-ready' : ''}`}
                    >
                      {player.netid} {player.ready ? '(Ready)' : ''}
                    </div>
                  ))}
                </div>
                
                {!raceState.inProgress && !raceState.completed && raceState.type !== 'practice' && (
                  <button 
                    className="ready-button" 
                    onClick={setPlayerReady}
                    disabled={raceState.players.some(p => p.netid === (window.user?.netid) && p.ready)}
                  >
                    Ready
                  </button>
                )}
              </div>
            )}
            
            {countdown !== null && (
              <div className="countdown">{countdown}</div>
            )}
          </div>
          
          {!raceState.completed ? (
            <Typing />
          ) : (
            <Results />
          )}
        </div>
      </div>
    </div>
  );
}

export default Race;