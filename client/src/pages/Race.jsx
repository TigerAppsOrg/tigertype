import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRace } from '../context/RaceContext';
import { useSocket } from '../context/SocketContext';
import Typing from '../components/Typing';
import Results from '../components/Results';
import './Race.css';

function Race() {
  const navigate = useNavigate();
  const { socket } = useSocket();
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
    if (!socket) return;
    
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

    // For practice mode, manually trigger countdown when game type is practice
    // Only start countdown if the race is not in progress or completed
    if (raceState.type === 'practice' && !raceState.inProgress && !raceState.completed && !countdown) {
      console.log('Setting up practice countdown');
      setCountdown(3);
      
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          console.log('Countdown tick:', prev);
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
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

  // Handle back button
  const handleBack = () => {
    resetRace();
    navigate('/home');
  };
  
  return (
    <div className="race-page">
      <div className="race-container">
      {raceState.type !== 'practice' && raceState.code && (
        <div className="back-button-container">
          <button className="back-button" onClick={handleBack}>
            <span>⟵</span> Back
          </button>
        </div>
      )}
      <h2>{raceState.type === 'practice' ? 'Practice Mode' : 'Race'}</h2>
            
            <div className="multiplayer-info">
            <div className="lobby-info-container">
            {raceState.type !== 'practice' && raceState.code && (
              <div className="lobby-code">Lobby Code: {raceState.code}</div>
            )}
            </div>
            
            <div className="player-container">
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
            </div>
            </div>

            {countdown !== null && !raceState.completed && !raceState.inProgress && (
              <div className="countdown">{countdown}</div>
            )}
          {!raceState.completed ? (
            <Typing />
          ) : (
            <Results />
          )}
        </div>
      </div>
  );
}

export default Race;