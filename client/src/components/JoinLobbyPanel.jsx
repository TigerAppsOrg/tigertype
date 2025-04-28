import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useRace } from '../context/RaceContext';
import './JoinLobbyPanel.css';

function JoinLobbyPanel({ className = '' }) {
  const { joinPrivateLobby } = useRace();

  const [input, setInput]   = useState('');
  const [error, setError]   = useState('');
  const [busy,  setBusy]    = useState(false);

  /* click inside → never trigger outer Mode onClick */
  const stopBubbling = (e) => e.stopPropagation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    let value = input.trim();
    setBusy(true);
    setError('');

    /* extract code if pasted a whole URL */
    try {
      const parsed = new URL(value);
      const parts  = parsed.pathname.split('/').filter(Boolean);
      const idx    = parts.findIndex((p) => p.toLowerCase() === 'lobby');
      if (idx !== -1 && parts[idx + 1]) value = parts[idx + 1];
    } catch (_) { /* not a URL – ignore */ }

    const codeRegex = /^[A-Za-z0-9]{6}$/; // Exactly 6 alphanumeric
    const isPotentialCode = codeRegex.test(value);

    // Always send as playerNetId (server will check this)
    // Also send as code if it matches the 6-char format
    const payload = {
      playerNetId: value.toLowerCase() // Send as lowercase NetID
    };
    if (isPotentialCode) {
      payload.code = value.toUpperCase(); // Add code field if it matches format
    }

    console.log('Sending join payload:', payload); // Add log to verify

    joinPrivateLobby(payload, (res) => {
      setBusy(false);
      // if (!res.success) setError(res.error || 'Lobby not found.');
      if (!res.success) setError(res.error || 'Lobby not found or is not joinable.'); // More generic error
      else setInput('');
    });
  };

  return (
    <div
      className={`join-lobby-panel ${className}`}
      onClick={stopBubbling}
      onMouseDown={stopBubbling}
    >
      <form className="join-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="join-input"
          placeholder="e.g. rdondero"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          maxLength={64}
        />
        <button
          type="submit"
          className="join-button"
          disabled={!input.trim() || busy}
        >
          Join
        </button>
      </form>
      {error && <div className="join-error">{error}</div>}
    </div>
  );
}

JoinLobbyPanel.propTypes = { className: PropTypes.string };
export default JoinLobbyPanel;
