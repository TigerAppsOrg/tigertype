import React, { useState, useEffect } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

// Helper function to create a step object
const makeStep = (target, content, placement = 'bottom', extra = {}) => ({
  target,
  content,
  placement,
  disableBeacon: true,
  ...extra,
});

// Define home steps outside the component to avoid recreation on each render
const homeSteps = [
  // --- Intro ---
  makeStep(
    'body', 
    'Welcome to TigerType! This quick tour will show you the main features.', 
    'center',
    { delay: 200 }
  ),

  // --- Home Screen ---
  makeStep(
    '.standard-modes-container .mode-box:first-child',
    'Practice Mode: Click here to hone your typing skills solo. This is where you type course evaluations or choose timed tests.',
    'bottom'
  ),
  makeStep(
    '.standard-modes-container .mode-box:nth-child(2)',
    'Quick Match: Jump into a public race against other players automatically.',
    'bottom'
  ),
  makeStep(
    '.private-modes-stack .mode-box:first-child',
    'Create Private Lobby: Start a race with friends using a code.',
    'top'
  ),
  makeStep(
    '.private-modes-stack .mode-box:nth-child(2)',
    'Join Private Lobby: Enter a code here to join a friend\'s race.',
    'top'
  ),

  // Step to move to Practice mode
  makeStep(
    '.standard-modes-container .mode-box:first-child',
    'Let\'s check out Practice Mode. CLICK THIS BOX NOW to continue the tutorial. The tutorial will wait for you on the Practice screen.',
    'bottom',
    { 
      spotlightClicks: true,
      hideCloseButton: true,
      hideBackButton: true,
      styles: {
        options: {
          primaryColor: '#ff7700',
        },
        tooltip: {
          backgroundColor: '#fef9e3',
        }
      }
    }
  ),
];

// Define practice steps
const practiceSteps = [
  // Practice Mode Screen
  makeStep(
    'body',
    'Great! Now you\'re in Practice Mode. Let\'s continue the tutorial.',
    'center',
    { delay: 500 }
  ),
  makeStep(
    '.test-configurator',
    'This is the Test Configurator. Here you can choose the type of practice.',
    'top', 
    { delay: 500 }
  ),
  makeStep(
    '.config-section.mode-selection .config-button:first-child',
    'Snippet Mode: Type text snippets, including Princeton course evaluations. This is selected by default.',
    'bottom'
  ),
  makeStep(
    '.config-section.mode-selection .config-button:nth-child(2)', 
    'Timed Mode: Test your speed against the clock for a set duration. Click this button to switch modes.',
    'bottom',
    { spotlightClicks: true }
  ),
  makeStep(
    '.duration-selection-inner',
    'Here you can select how long you want to type. Try different durations!',
    'bottom'
  ),
  makeStep(
    '.config-section.mode-selection .config-button:first-child',
    'Click back to Snippet mode to try typing a course evaluation.',
    'bottom',
    { spotlightClicks: true }
  ),
  makeStep(
    '.snippet-options',
    'Here you can filter snippets by difficulty, type, or department.',
    'top'
  ),
  makeStep(
    '.race-content',
    'This is where the text appears. Start typing when you\'re ready!',
    'top'
  ),
  makeStep(
    '.back-button',
    'When you\'re done, click this button to return to the home screen.',
    'bottom',
    { spotlightClicks: true }
  )
];

// Final steps including end of tutorial
const finalSteps = [
  makeStep(
    'body',
    'That covers the main features! You can replay this tutorial anytime using the \'?\' button in the navbar. Happy typing!',
    'center'
  ),
];

const TutorialGuide = ({ isTutorialRunning, handleTutorialEnd }) => {
  const { markTutorialComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [currentPath, setCurrentPath] = useState('/');

  // Set current path when location changes
  useEffect(() => {
    const previousPath = currentPath;
    setCurrentPath(location.pathname);
    console.log('TutorialGuide: Path changed from', previousPath, 'to', location.pathname);
    
    // If navigating from Home to Race, reset step index to 0 for practice steps
    if (previousPath === '/home' && location.pathname === '/race' && isTutorialRunning) {
      console.log('Navigation detected: Home → Race. Resetting step index for practice steps.');
      setStepIndex(0);
    }
  }, [location.pathname]);

  // Debug log when tutorial state changes
  useEffect(() => {
    console.log('TutorialGuide: isTutorialRunning =', isTutorialRunning, 'at path', currentPath);
  }, [isTutorialRunning, currentPath]);

  // Get the appropriate steps based on current path
  const getActiveSteps = () => {
    console.log('Getting steps for path:', currentPath);
    if (currentPath.includes('/race')) {
      console.log('Showing practice steps');
      return practiceSteps;
    }
    // Default to home steps for any other path
    console.log('Showing home steps');
    return homeSteps;
  };

  // Reset step index when tutorial starts
  useEffect(() => {
    if (isTutorialRunning) {
      setStepIndex(0);
      console.log('Tutorial started, reset step index to 0');
    }
  }, [isTutorialRunning]);

  // Handle Joyride callback events
  const handleJoyrideCallback = (data) => {
    const { status, action, index, type, lifecycle } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    console.log(`Joyride callback: Index: ${index}, Status: ${status}, Type: ${type}, Action: ${action}, Lifecycle: ${lifecycle}`);

    // Update stepIndex for tracking progress
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + 1);
      console.log(`Advanced to step ${index + 1}`);
    }

    // Handle tutorial completion
    if (finishedStatuses.includes(status)) {
      console.log('Tutorial finished or skipped. Marking as complete...');
      markTutorialComplete();
      handleTutorialEnd();
    } 
    // Handle target not found errors gracefully
    else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`Target not found for step ${index}:`, getActiveSteps()[index]?.target);
      
      // Skip this step instead of ending the tutorial
      if (getActiveSteps().length > index + 1) {
        console.log('Target not found, skipping to next step');
        setStepIndex(index + 1);
      } else {
        console.log('No more steps available, ending tutorial');
        handleTutorialEnd();
      }
    } 
    else if (type === EVENTS.ERROR) {
      console.error('Joyride error:', data);
      handleTutorialEnd();
    }
  };

  const steps = getActiveSteps();
  console.log('Active steps array:', steps.map(step => step.target));
  
  return (
    <>
      {console.log('Rendering Joyride with', steps.length, 'steps, running:', isTutorialRunning, 'current step:', stepIndex)}
      <Joyride
        steps={steps}
        stepIndex={stepIndex}
        run={isTutorialRunning}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        debug={true}
        styles={{
          options: {
            primaryColor: '#E77500',
            textColor: '#333',
            zIndex: 10000,
          }
        }}
      />
    </>
  );
};

export default TutorialGuide; 