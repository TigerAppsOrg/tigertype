import React from 'react';
import './PlayerStatusBar.css';
// Import default profile image
import defaultProfileImage from '../assets/default-profile.svg';

function PlayerStatusBar({ players, isRaceInProgress, currentUser, onReadyClick }) {
  // For debug
  console.log("PlayerStatusBar - isRaceInProgress:", isRaceInProgress);
  console.log("PlayerStatusBar - players:", players);
  return (
    <div className="player-status-bar">
      {players.map((player, index) => (
        <div
          key={index}
          className={`player-card ${!isRaceInProgress && player.ready ? 'player-ready' : ''}`}
        >
          <div className="player-info">
            <div className="player-identity">
              <div className="player-avatar">
                <img 
                  src={player.avatar_url || defaultProfileImage} 
                  alt={`${player.netid}'s avatar`}
                />
              </div>
              <span className="player-name">{player.netid}</span>
            </div>
            
            {!isRaceInProgress ? (
              // Lobby mode - show ready status/button
              player.netid === currentUser?.netid ? (
                <button
                  className={`ready-button ${player.ready ? 'ready-active' : ''}`}
                  onClick={onReadyClick}
                  disabled={player.ready}
                >
                  {player.ready ? 'Ready' : 'Ready Up'}
                </button>
              ) : (
                <span className={`ready-status ${player.ready ? 'ready-active' : ''}`}>
                  {player.ready ? 'Ready' : 'Not Ready'}
                </span>
              )
            ) : null}
          </div>
          
          {isRaceInProgress && (
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${player.progress || 0}%` }}
                ></div>
                <div className="progress-label">
                  {player.progress || 0}%
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default PlayerStatusBar;