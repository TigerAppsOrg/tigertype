import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRace } from '../context/RaceContext';
import './CustomLobby.css';
import Modal from '../components/Modal';
import ProfileWidget from '../components/ProfileWidget';
import PlayerStatusBar from '../components/PlayerStatusBar';

function CustomLobby() {
    const [isSelecting, setIsSelecting] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [isLobbyAdmin, setIsLobbyAdmin] = useState(false);
    const navigate = useNavigate();
    const { 
        raceState, 
        typingState,
        inactivityState,
        setPlayerReady,
        resetRace,
        dismissInactivityWarning,
        dismissInactivityKick,
        setRaceState,
        loadNewSnippet
      } = useRace();

    const handleJoinEnter = () => {
        // Needs socket join emission here
        setIsSelecting(false);
        setIsJoining(false);
    };

    const handleJoinClose = () => {
        setIsJoining(false);
    };

    const handleCreate = () => {
        // Needs socket join emission here
        setIsSelecting(false);
        setIsLobbyAdmin(true);
    };

    const handleBack = () => {
        // Needs socket emission here
        setIsSelecting(true);
        setIsLobbyAdmin(false);
    };

    const handleSelectBack = () => {
        resetRace();
        navigate('/home');
    };

    return(
        <div className="lobby-page">
            {isSelecting && <button className="back-button" onClick={handleSelectBack}>
                <span>⟵</span> Back
            </button>}
            <Modal
                isOpen={isJoining}
                title="Enter Private Lobby Code"
                children={(
                    <>
                    <div id="lobby-code-input-container">
                        <input id="lobby-code-input" autoFocus></input>
                    </div>
                    </>
                    )}
                showCloseButton={true}
                onClose={handleJoinClose}
                onEnter={handleJoinEnter}
            />

            {isSelecting && 
            <div className="lobby-select-container">
                <div className="lobby-select-header">
                    <h1>Custom Lobby Options</h1>
                </div>
                <div>
                    <div className="lobby-select" onClick={handleCreate}>
                        <h3>Create Private Lobby</h3>
                        <p>Invite and compete against friends</p>
                    </div>
                    <br />
                    <div className="lobby-select" onClick={() => setIsJoining(true)}>
                        <h3>Join Private Lobby</h3>
                        <p>Hop into a friend's existing lobby via Lobby Code</p>
                    </div>
                </div>
            </div>}

            {!isSelecting && 
            <div className="lobby-container">
                <div className="lobby-back-button-container">
                    <button className="lobby-back-button" onClick={handleBack}>
                    <span>⟵</span> Back
                    </button>
                </div>
                <h1 className="lobby-name">User1's Custom Lobby</h1>
                <h3 className="player-count">Players: 3/6</h3>
                <div className="private-lobby-code">Lobby Code: {raceState.code}</div>
                <div className="players-container">
                    <div id="placeholders-inlobby" className="lobby-players-container">
                        <div className="player-placeholder" />
                        <div className="player-placeholder" />
                        <div className="player-placeholder" />
                        <div className="player-placeholder" />
                        <div className="player-placeholder" />
                        <div className="player-placeholder" />
                    </div>

                    <div id="players-inlobby" className="lobby-players-container">
                        {/* Should either be ProfileWidgets that direct to the profile modal or ProfileStatusBars */}
                        {/* I was thinking that we could do a white highlight fadein/fadeout animation for when 
                            a user fills in a placeholder slot and a red one when they leave the lobby */}
                        <ProfileWidget className="player-inlobby" />
                        <ProfileWidget className="player-inlobby" />
                        <ProfileWidget className="player-inlobby" />
                    </div>
                </div>
            </div>
            }
        </div>
    );
};

export default CustomLobby;