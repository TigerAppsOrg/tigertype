import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useRace } from '../context/RaceContext';
import './JoinLobbyPanel.css';

/* ------------------------------------------------------
 *  JoinLobbyPanel – allows users to quickly join a lobby
 *  by entering either the lobby code OR the netID of any
 *  player that is currently inside a lobby.
 * ---------------------------------------------------- */

function JoinLobbyPanel({ className = '' }) {
  const { joinPrivateLobby } = useRace();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const value = input.trim();
    setSubmitting(true);
    setError('');

    // Decide whether the input is a lobby code or a netid.
    // Very simply done bc i am no very smart: 
    // valid lobby codes in TigerType are
    // 4–6 alphanumeric (uppercase ignored) whereas NetIDs are
    // typically >= 6 characters and may contain numbers but must
    // start with a letter.
    const codeRegex = /^[A-Za-z0-9]{4,6}$/; // this regex is wrong, come back and fix later

    const isCode = codeRegex.test(value);

    const payload = isCode ? { code: value.toUpperCase() } : { playerNetId: value.toLowerCase() };

    joinPrivateLobby(payload, (response) => {
      setSubmitting(false);
      if (!response.success) {
        setError(response.error || 'Lobby not found.');
      } else {
        // If successful the RaceContext will navigate to the lobby/race; clear input.
        setInput('');
      }
    });
  };

  return (
    <div className={`join-lobby-panel ${className}`}>
      <h3 className="panel-title">Join a Lobby</h3>
      <form className="join-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="join-input"
          placeholder="Enter lobby code or player NetID"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={submitting}
          maxLength={32}
        />
        <button
          type="submit"
          className="join-button"
          disabled={!input.trim() || submitting}
        >
          Join
        </button>
      </form>
      {error && <div className="join-error">{error}</div>}
    </div>
  );
}

JoinLobbyPanel.propTypes = {
  className: PropTypes.string,
};

export default JoinLobbyPanel;
