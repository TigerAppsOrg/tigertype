import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRace } from '../context/RaceContext';
import { useSocket } from '../context/SocketContext';
import TestConfigurator from '../components/TestConfigurator';
import Modal from '../components/Modal';
import PlayerStatusBar from '../components/PlayerStatusBar';
import './Race.css'; // Reuse base styles
import './Lobby.css';

function Lobby() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const {
    raceState,
    setRaceState,
    resetRace,
    setPlayerReady,
    loadNewSnippet,
  } = useRace();

  const [inviteNetid, setInviteNetid] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);
  const [inviteModal, setInviteModal] = useState({ open: false, inviter: '', code: '' });

  // Listen for lobby:invited event
  useEffect(() => {
    if (!socket) return;
    const handleInvited = (data) => {
      setInviteModal({
        open: true,
        inviter: data.inviterNetid,
        code: data.lobbyCode,
      });
    };
    socket.on('lobby:invited', handleInvited);
    return () => {
      socket.off('lobby:invited', handleInvited);
    };
  }, [socket]);

  // Handle sending invite
  const handleInvite = () => {
    if (!inviteNetid || !raceState.code) return;
    setInviteStatus('pending');
    socket.emit('lobby:invite_by_netid', { netid: inviteNetid, lobbyCode: raceState.code });
    // Listen for confirmation/errors
    const onSent = (data) => {
      setInviteStatus('sent');
      setTimeout(() => setInviteStatus(null), 2000);
    };
    const onError = (err) => {
      setInviteStatus('error');
      setTimeout(() => setInviteStatus(null), 2000);
    };
    socket.once('invite:sent', onSent);
    socket.once('error', onError);
  };

  // Handle accepting invite
  const handleAcceptInvite = () => {
    if (inviteModal.code) {
      // Join the lobby by code
      socket.emit('lobby:join', { code: inviteModal.code });
      setInviteModal({ open: false, inviter: '', code: '' });
      // Optionally, navigate to the lobby page
      navigate(`/lobby/${inviteModal.code}`);
    }
  };

  // Handle declining invite
  const handleDeclineInvite = () => {
    setInviteModal({ open: false, inviter: '', code: '' });
  };

  // Handle leaving the lobby
  const handleLeave = () => {
    resetRace();
    navigate('/home');
  };

  // Render player grid (2 rows of 5)
  const renderPlayerGrid = () => {
    const players = raceState.players || [];
    const grid = [];
    for (let i = 0; i < 10; i++) {
      if (i < players.length) {
        const player = players[i];
        grid.push(
          <div className="lobby-player-card" key={player.netid}>
            <div className="lobby-player-avatar">
              <img
                src={player.avatar_url || '/assets/icons/default-profile.svg'}
                alt={player.netid}
                className="lobby-avatar-img"
              />
            </div>
            <div className="lobby-player-info">
              <div className="lobby-player-netid">{player.netid}</div>
              <div className="lobby-player-title">Title</div>
              <div className="lobby-player-badges">
                {/* Placeholder for badges */}
              </div>
            </div>
            <div className="lobby-player-stats-link">
              {/* TODO: Implement stats modal */}
              <button className="lobby-stats-btn" disabled>Stats</button>
            </div>
          </div>
        );
      } else {
        grid.push(
          <div className="lobby-player-card lobby-invite-placeholder" key={`invite-${i}`}>
            <button className="lobby-invite-btn" disabled>Invite Player</button>
          </div>
        );
      }
    }
    // Split into two rows
    return (
      <div className="lobby-player-grid">
        <div className="lobby-player-row">{grid.slice(0, 5)}</div>
        <div className="lobby-player-row">{grid.slice(5, 10)}</div>
      </div>
    );
  };

  return (
    <div className="lobby-page">
      {/* Invite Modal */}
      <Modal
        isOpen={inviteModal.open}
        title="Lobby Invitation"
        message={
          <>
            <div>
              <b>{inviteModal.inviter}</b> has invited you to join their private lobby.
            </div>
            <div>Lobby Code: <b>{inviteModal.code}</b></div>
          </>
        }
        buttonText="Join Lobby"
        onClose={handleAcceptInvite}
        secondaryButtonText="Dismiss"
        onSecondary={handleDeclineInvite}
      />

      <div className="lobby-container">
        {/* Left: Lobby Info and Settings */}
        <div className="lobby-left">
          <div className="lobby-header">
            <h2 className="lobby-title">
              {raceState.hostId === window.user?.id
                ? "Your Private Lobby"
                : `${raceState.hostNetid || "Host"}'s Private Lobby`}
            </h2>
            <button className="lobby-leave-btn" onClick={handleLeave}>Leave</button>
          </div>
          <div className="lobby-info">
            <div className="lobby-code-row">
              <span className="lobby-label">Lobby Code:</span>
              <span className="lobby-code-value">{raceState.code}</span>
            </div>
            <div className="lobby-players-row">
              <span className="lobby-label">Players:</span>
              <span>{(raceState.players || []).length} / 10</span>
            </div>
          </div>
          {/* Invite by NetID */}
          <div className="lobby-invite-section">
            <input
              type="text"
              className="lobby-invite-input"
              placeholder="Enter NetID to invite"
              value={inviteNetid}
              onChange={e => setInviteNetid(e.target.value)}
              disabled={inviteStatus === 'pending'}
            />
            <button
              className="lobby-invite-action-btn"
              onClick={handleInvite}
              disabled={!inviteNetid || inviteStatus === 'pending'}
            >
              {inviteStatus === 'pending' ? 'Inviting...' : 'Invite'}
            </button>
            {inviteStatus === 'sent' && <span className="lobby-invite-status success">Invite sent!</span>}
            {inviteStatus === 'error' && <span className="lobby-invite-status error">Invite failed</span>}
          </div>
          {/* TestConfigurator for host */}
          {raceState.hostId === window.user?.id && (
            <div className="lobby-configurator-section">
              <TestConfigurator
                testMode={raceState.testMode || 'snippet'}
                testDuration={raceState.testDuration || 15}
                snippetDifficulty={raceState.snippetDifficulty || ''}
                snippetType={raceState.snippetType || ''}
                snippetDepartment={raceState.snippetDepartment || 'all'}
                setTestMode={mode => setRaceState(prev => ({ ...prev, testMode: mode }))}
                setTestDuration={duration => setRaceState(prev => ({ ...prev, testDuration: duration }))}
                setSnippetDifficulty={diff => setRaceState(prev => ({ ...prev, snippetDifficulty: diff }))}
                setSnippetType={type => setRaceState(prev => ({ ...prev, snippetType: type }))}
                setSnippetDepartment={dept => setRaceState(prev => ({ ...prev, snippetDepartment: dept }))}
                setRaceState={setRaceState}
                loadNewSnippet={loadNewSnippet}
                onShowLeaderboard={() => {}} // Not used in lobby
              />
            </div>
          )}
          {/* Start Race button for host */}
          {raceState.hostId === window.user?.id && (
            <button className="lobby-start-btn" onClick={setPlayerReady}>
              Start Race
            </button>
          )}
        </div>
        {/* Right: Player Grid */}
        <div className="lobby-right">
          {renderPlayerGrid()}
        </div>
      </div>
    </div>
  );
}

export default Lobby;
