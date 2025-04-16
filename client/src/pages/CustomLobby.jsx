import React, { useState } from 'react';
import { useRace } from '../context/RaceContext';
import './CustomLobby.css';
import Modal from '../components/Modal';

function CustomLobby() {
    const [isJoining, setIsJoining] = useState(false);
    const [isLobbyAdmin, setIsLobbyAdmin] = useState(false);

    const handleJoin = () => {
        // Needs socket join emission here
        // Needs to hide lobby select screen
        setIsJoining(false);
    };

    return(
        <div className="lobby-page">
            <Modal
                isOpen={isJoining}
                title="Enter Private Lobby Code"
                message={(<div id="lobby-code-input-container">
                            <input id="lobby-code-input" autoFocus></input>
                            </div>)}
                buttonText="Join lobby"
                onClose={handleJoin}
                onEnter={handleJoin}
            />

            <div className="lobby-select-container">
                <div className="lobby-select-header">
                    <h1>Custom Lobby Options</h1>
                </div>
                <div>
                    <div className="lobby-select" onClick={() => setIsLobbyAdmin(true)}>
                        <h3>Create Private Lobby</h3>
                        <p>Invite and compete against friends</p>
                    </div>
                    <br />
                    <div className="lobby-select" onClick={() => setIsJoining(true)}>
                        <h3>Join Private Lobby</h3>
                        <p>Hop into a friend's existing lobby via Lobby Code</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomLobby;