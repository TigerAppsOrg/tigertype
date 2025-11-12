import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PlayerStatusBar.css';
import defaultProfileImage from '../assets/icons/default-profile.svg';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import ProfileModal from './ProfileModal.jsx';

function PlayerStatusBar({
  players,
  isRaceInProgress,
  currentUser,
  onReadyClick,
  countdownActive = false,
  waitingForMinimumPlayers = false,
  readinessSummary = null,
  readinessDetail = null
}) {
  const [enlargedAvatar, setEnlargedAvatar] = useState(null);
  const { authenticated, user } = useAuth();
  const [selectedProfileNetid, setSelectedProfileNetid] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  // State for storing fetched titles per player netid
  const [playerTitlesMap, setPlayerTitlesMap] = useState({});
  const [pillState, setPillState] = useState(null);
  const [pillVisible, setPillVisible] = useState(false);
  const pillHideTimeout = useRef(null);
  const pillEntryTimeout = useRef(null);
  const pillMountedRef = useRef(false);
  const showProgressBars = isRaceInProgress;
  
  // For debug
  // console.log("PlayerStatusBar - isRaceInProgress:", isRaceInProgress);
  // console.log("PlayerStatusBar - players:", players);
  
  const handleAvatarClick = (avatar, netid) => {
    if (authenticated) {
      setSelectedProfileNetid(netid);
      setShowProfileModal(true);
    } else {
      setEnlargedAvatar({ url: avatar || defaultProfileImage, netid });
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }
  };
  
  const closeModal = useCallback(() => {
    setEnlargedAvatar(null);
    // Re-enable scrolling
    document.body.style.overflow = '';
  }, []);
  
  const closeEnlargedAvatar = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };
  
  // Handle escape key press to close modal
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
  
  // Fetch titles for each player and current user
  useEffect(() => {
    players.forEach(player => {
      const netid = player.netid;
      // Sync context titles for current user
      if (netid === user?.netid && user?.titles && playerTitlesMap[netid] !== user.titles) {
        setPlayerTitlesMap(prev => ({ ...prev, [netid]: user.titles }));
      }
      // Fetch other players' titles if not already fetched
      if (netid !== user?.netid && !(netid in playerTitlesMap)) {
        axios.get(`/api/user/${netid}/titles`)
          .then(res => setPlayerTitlesMap(prev => ({ ...prev, [netid]: res.data || [] })))
          .catch(err => {
            console.error(`Error fetching titles for ${netid}:`, err);
            setPlayerTitlesMap(prev => ({ ...prev, [netid]: [] }));
          });
      }
    });
  }, [players, user, playerTitlesMap]);
  
  useEffect(() => {
    return () => {
      if (pillHideTimeout.current) {
        clearTimeout(pillHideTimeout.current);
        pillHideTimeout.current = null;
      }
      if (pillEntryTimeout.current) {
        clearTimeout(pillEntryTimeout.current);
        pillEntryTimeout.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    const shouldShowPill = !!readinessSummary && !countdownActive;

    if (!shouldShowPill) {
      if (!pillState) {
        return;
      }

      if (pillEntryTimeout.current) {
        clearTimeout(pillEntryTimeout.current);
        pillEntryTimeout.current = null;
      }

      if (pillHideTimeout.current) {
        clearTimeout(pillHideTimeout.current);
        pillHideTimeout.current = null;
      }

      setPillVisible(false);
      pillHideTimeout.current = setTimeout(() => {
        setPillState(null);
        pillMountedRef.current = false;
        pillHideTimeout.current = null;
      }, 600);
      return;
    }

    const nextState = {
      summary: readinessSummary,
      detail: readinessDetail || '',
      pending: waitingForMinimumPlayers
    };

    setPillState((prev) => {
      if (
        prev &&
        prev.summary === nextState.summary &&
        prev.detail === nextState.detail &&
        prev.pending === nextState.pending
      ) {
        return prev;
      }
      return nextState;
    });

    if (pillHideTimeout.current) {
      clearTimeout(pillHideTimeout.current);
      pillHideTimeout.current = null;
    }

    const isFirstMount = !pillMountedRef.current;
    pillMountedRef.current = true;

    if (pillVisible) {
      return;
    }

    if (pillEntryTimeout.current) {
      clearTimeout(pillEntryTimeout.current);
      pillEntryTimeout.current = null;
    }

    pillEntryTimeout.current = setTimeout(() => {
      setPillVisible(true);
      pillEntryTimeout.current = null;
    }, isFirstMount ? 120 : 40);
  }, [readinessSummary, readinessDetail, waitingForMinimumPlayers, countdownActive]);
  
  return (
    <>
      <div className="player-status-bar">
        <div className="player-status-header">
          <span className="player-status-title">Players</span>
          <div className="player-status-pill-container">
            {pillState && (
              <span
                className={`player-status-pill ${pillState.pending ? 'pending' : 'ready'} ${pillVisible ? 'pill-visible' : 'pill-hidden'}`}
                role="status"
                aria-live="polite"
                title={pillState.detail}
              >
                <span className="material-icons player-status-pill-icon">
                  {pillState.pending ? 'groups' : 'check_circle'}
                </span>
                <span className="player-status-pill-text">
                  {pillState.summary}
                </span>
              </span>
            )}
          </div>
        </div>
        {players.map((player, index) => {
          const isDisconnected = !!player.disconnected;
          const isCurrentUser = player.netid === currentUser?.netid;
          const hasMistake = !!player.hasMistake;
          const primaryLabel = player.ready ? 'Ready' : 'Ready Up';
          const readyHint = waitingForMinimumPlayers
            ? 'Need at least two players before the countdown begins'
            : 'Race starts when everyone readies up';
          return (
            <div
              key={index}
              className={`player-card ${!isRaceInProgress && player.ready ? 'player-ready' : ''} ${isDisconnected ? 'player-disconnected' : ''}`}
            >
              <div className="player-info">
                <div className="player-identity">
                  <div
                    className="player-avatar"
                    title={`${player.netid}'s avatar (click to enlarge)`}
                    onClick={() => handleAvatarClick(player.avatar_url, player.netid)}
                    role="button"
                    aria-label={`View ${player.netid}'s avatar`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleAvatarClick(player.avatar_url, player.netid);
                        e.preventDefault();
                      }
                    }}
                  >
                    <img 
                      src={player.avatar_url || defaultProfileImage} 
                      alt={`${player.netid}'s avatar`}
                      onError={(e) => { e.target.onerror = null; e.target.src=defaultProfileImage; }}
                    />
                  </div>
                  <div className="player-text">
                    <span className="player-name">{player.netid}</span>
                    {/* Determine the title to display */}
                    {(() => {
                      const titles = playerTitlesMap[player.netid];
                      let titleToShow = null;

                      if (titles && titles.length > 0) {
                        const equippedTitle = titles.find(t => t.is_equipped);
                        titleToShow = equippedTitle || titles[0];
                      }

                      return titleToShow ? (
                        <div className="player-titles">
                          <span className="player-title-badge">
                            {titleToShow.name}
                          </span>
                        </div>
                      ) : null; // Return null if no title should be displayed
                    })()}
                    {/* Disconnected badge */}
                    {isDisconnected && (
                      <span className="player-disconnected-badge">Disconnected</span>
                    )}
                  </div>
                </div>
                
                {!isRaceInProgress ? (
                  // Lobby mode - show ready status/button
                  isCurrentUser ? (
                    <button
                      className={`ready-button ${player.ready ? 'ready-active' : !player.ready && waitingForMinimumPlayers ? 'ready-standby' : ''}`}
                      onClick={onReadyClick}
                      disabled={player.ready}
                      title={readyHint}
                      aria-label={`${primaryLabel}. ${readyHint}`}
                    >
                      {primaryLabel}
                    </button>
                  ) : (
                    <span className={`ready-status ${player.ready ? 'ready-active' : ''}`}>
                      {player.ready ? 'Ready' : 'Not Ready'}
                    </span>
                  )
                ) : null}
              </div>
              
              {showProgressBars && (
                <div className={`progress-container ${hasMistake ? 'progress-has-error' : ''}`}>
                  <div className="progress-bar">
                    {hasMistake && (
                      <div className="progress-error-indicator" role="status" aria-label="Player must fix errors">
                        <span className="material-icons" aria-hidden="true">error_outline</span>
                        <span>Fix errors</span>
                      </div>
                    )}
                    <div
                      className={`progress-fill ${isDisconnected ? 'disconnected' : ''} ${hasMistake ? 'has-error' : ''}`}
                      style={{ width: `${player.progress || 0}%` }}
                    ></div>
                    <div className={`progress-label ${hasMistake ? 'progress-label-error' : ''}`}>
                      {isDisconnected ? 'DC' : `${player.progress || 0}%`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
                onError={(e) => { e.target.onerror = null; e.target.src=defaultProfileImage; }}
              />
              <div className="avatar-modal-name">{enlargedAvatar.netid}</div>
            </div>
          </div>
        </div>
      )}
      {/* Profile Modal for viewing user profiles (authenticated users) */}
      {authenticated && showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          netid={selectedProfileNetid}
        />
      )}
    </>
  );
}

export default PlayerStatusBar;
