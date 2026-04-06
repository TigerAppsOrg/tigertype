import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRace } from '../context/RaceContext';
import { useTutorial } from '../context/TutorialContext';
import { tutorialSteps } from '../tutorial/tutorialSteps';
import { useSocket } from '../context/SocketContext';
import Typing from '../components/Typing';
import Results from '../components/Results';
import PlayerStatusBar from '../components/PlayerStatusBar';
import Modal from '../components/Modal';
import TestConfigurator from '../components/TestConfigurator';
import Leaderboard from '../components/Leaderboard';
import TutorialAnchor from '../components/TutorialAnchor';
import './Race.css';

const MIN_PLAYERS_FOR_PUBLIC_RACE = 2;

function Race() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const {
    raceState,
    typingState,
    inactivityState,
    setPlayerReady,
    resetRace,
    dismissInactivityWarning,
    dismissInactivityKick,
    setRaceState,
    loadNewSnippet,
    testMode,
    setTestMode,
    testDuration,
    setTestDuration,
    snippetDifficulty,
    setSnippetDifficulty,
    snippetCategory,
    setSnippetCategory,
    snippetSubject,
    setSnippetSubject,
    snippetError
  } = useRace();
  const { isRunning, currentSection, currentStepIndex } = useTutorial();
  // index of the practice tutorial step when results screen should appear
  const practiceResultIndex = tutorialSteps.practice.findIndex(s => s.id === 'practice-results-screen');
  
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const players = raceState.players || [];
  const playersJoined = players.length;
  const readyCount = players.reduce((count, player) => (player.ready ? count + 1 : count), 0);
  const playersNeededToStart = Math.max(0, MIN_PLAYERS_FOR_PUBLIC_RACE - playersJoined);
  const waitingForMinimumPlayers = playersNeededToStart > 0;
  const countdownActive = raceState.countdown !== null;
  const shouldShowLobbyStatus = raceState.type === 'public' && !raceState.inProgress && !raceState.completed && !countdownActive;
  const targetReadyCount = MIN_PLAYERS_FOR_PUBLIC_RACE;
  const displayedReady = Math.min(readyCount, targetReadyCount);
  const readinessSummary = shouldShowLobbyStatus
    ? `Ready ${displayedReady}/${targetReadyCount}`
    : null;
  const readinessDetail = shouldShowLobbyStatus
    ? (waitingForMinimumPlayers
        ? `Need ${playersNeededToStart} more racer${playersNeededToStart === 1 ? '' : 's'} to launch`
        : 'Minimum met. Waiting for everyone to ready up.')
    : null;

  // If there is no active race context, redirect to home
  useEffect(() => {
    // raceState.code is set whenever a race or practice session exists
    if (!raceState.code) {
      navigate('/home', { replace: true });
    }
  }, [raceState.code, navigate]);
  
  // Handle back button
  const handleBack = () => {
    resetRace(true);
    navigate('/home');
  };
  
  // Handle ready button when there's an inactivity warning
  const handleReadyFromWarning = () => {
    dismissInactivityWarning();
    setPlayerReady();
  };

  // Toggle leaderboard modal
  const toggleLeaderboard = () => {
    setShowLeaderboard(prev => !prev);
  };

  return (
    <div className="race-page">
      {/* Inactivity Warning Modal */}
      <Modal
        isOpen={inactivityState.warning}
        title="Ready Up Required"
        message={inactivityState.warningMessage || "Please ready up to continue in this lobby."}
        buttonText="Ready Up Now"
        onClose={handleReadyFromWarning}
      />
      
      {/* Kicked for Inactivity Modal */}
      <Modal
        isOpen={inactivityState.kicked}
        isAlert={true}
        title="Removed for Inactivity"
        message={inactivityState.kickMessage || "You have been removed from the lobby due to inactivity."}
        buttonText="I Understand"
        onClose={dismissInactivityKick}
      />
      
      {/* Leaderboard Modal */}
      <Modal
        isOpen={showLeaderboard}
        onClose={toggleLeaderboard}
        showCloseButton={true}
        isLarge={true}
      >
        <Leaderboard 
           defaultDuration={testDuration}
        />
      </Modal>
      
      <div className="race-container">
        <div className="race-header-wrapper">
          {/* Only show race title/back button before results */}
          {!raceState.completed && (
            <>
              <h1 className="race-title">{raceState.type === 'practice' ? 'Practice Mode' : 'Race'}</h1>
              <TutorialAnchor anchorId="back-button">
                <button className="back-button" onClick={handleBack}>
                  <span className="material-icons">arrow_back</span> Back
                </button>
              </TutorialAnchor>
            </>
          )}
          {/* Only show lobby code for private lobbies */}
          {raceState.type === 'private' && raceState.code && (
            <div className="lobby-code">Lobby Code: {raceState.code}</div>
          )}
        </div>
        
        {/* TestConfigurator - render only in practice mode */}
        {raceState.type === 'practice' && (
          <TutorialAnchor anchorId="configurator">
            {/* tiny wrapper ensures non-zero bounding box immediately */}
            <div style={{ minWidth: 1, minHeight: 1 }}>
              <TestConfigurator
                testMode={testMode}
                testDuration={testDuration}
                snippetDifficulty={snippetDifficulty}
                snippetCategory={snippetCategory}
                snippetSubject={snippetSubject}
                setTestMode={setTestMode}
                setTestDuration={setTestDuration}
                setSnippetDifficulty={setSnippetDifficulty}
                setSnippetCategory={setSnippetCategory}
                setSnippetSubject={setSnippetSubject}
                setRaceState={setRaceState}
                loadNewSnippet={loadNewSnippet}
                snippetError={snippetError}
                onShowLeaderboard={toggleLeaderboard}
              />
            </div>
          </TutorialAnchor>
        )}
        
        <TutorialAnchor anchorId="race-content">
        <div className="race-content">
          <div className="race-info">
            <div className="race-content-container">
              {/* Conditionally render Typing */}
              {/* Show Typing if:
                  - It's practice mode OR
                  - It's multiplayer AND not completed */}
              {(raceState.type === 'practice' || !raceState.completed) && (
                <Typing 
                  testMode={raceState.type === 'practice' ? testMode : null}
                  testDuration={raceState.type === 'practice' ? testDuration : null}
                  snippetDifficulty={raceState.type === 'practice' ? snippetDifficulty : null}
                  snippetCategory={raceState.type === 'practice' ? snippetCategory : null}
                  snippetSubject={raceState.type === 'practice' ? snippetSubject : null}
                />
              )}

              {/* Conditionally render Results */}
              {/* Show Results if race is completed */}
              {raceState.completed && (!isRunning || (currentSection === 'practice' && currentStepIndex >= practiceResultIndex)) && (
                 <Results
                   onShowLeaderboard={raceState.type === 'practice' ? toggleLeaderboard : null}
                 />
              )}
            </div>
            
            <div className="player-status-container">
              {/* Player Status Bar (Only relevant for multiplayer and when race is not completed) */}
              {players.length > 0 && raceState.type !== 'practice' && !raceState.completed && (
                <PlayerStatusBar
                  players={players}
                  isRaceInProgress={raceState.inProgress}
                  currentUser={window.user}
                  onReadyClick={setPlayerReady}
                  countdownActive={countdownActive}
                  waitingForMinimumPlayers={shouldShowLobbyStatus && waitingForMinimumPlayers}
                  readinessSummary={shouldShowLobbyStatus ? readinessSummary : null}
                  readinessDetail={shouldShowLobbyStatus ? readinessDetail : null}
                />
              )}
            </div>
          </div>
        </div>
        </TutorialAnchor>
      </div>
    </div>
  );
}

export default Race;
