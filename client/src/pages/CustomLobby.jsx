import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext';
import './CustomLobby.css';
import Modal from '../components/Modal';

function CustomLobby() {
    const [isSelecting, setIsSelecting] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [isLobbyAdmin, setIsLobbyAdmin] = useState(false);

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

    return(
        <div className="lobby-page">
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

            {isSelecting && <div className="lobby-select-container">
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

            <div>
                
            </div>
        </div>
    );
};

export default CustomLobby;