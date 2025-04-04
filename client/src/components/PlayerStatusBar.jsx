import React from 'react';
import './PlayerStatusBar.css';

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
            <span className="player-name">{player.netid}</span>
            
            {!isRaceInProgress ? (
              // Lobby mode => show ready status/button
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
            ) : (
              // Race mode => show progress
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${player.progress || 0}%` }}
                  ></div>
                  <div className="progress-label">
                    {player.netid}: {player.progress || 0}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PlayerStatusBar;