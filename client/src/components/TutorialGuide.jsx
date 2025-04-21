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
    'Welcome to TigerType! This guided tour will show you all the features and how to use them effectively.', 
    'center',
    { delay: 200 }
  ),

  // --- Home Screen Standard Modes ---
  makeStep(
    '.standard-modes-container .mode-box:first-child',
    'Practice Mode: Improve your typing skills at your own pace. You can type course evaluations or do timed tests to see your speed and accuracy.',
    'bottom'
  ),
  makeStep(
    '.standard-modes-container .mode-box:nth-child(2)',
    'Quick Match: Jump into a multiplayer typing race against other Princeton students. The system will automatically match you with available players.',
    'bottom'
  ),

  // --- Home Screen Private Modes ---
  makeStep(
    '.private-modes-stack .mode-box:first-child',
    'Create Private Lobby: Start a private typing race with your friends using a unique lobby code that you can share.',
    'top'
  ),
  makeStep(
    '.private-modes-stack .mode-box:nth-child(2)',
    'Join Private Lobby: Enter a lobby code shared by your friend to join their private typing race.',
    'top'
  ),

  // --- Let's try Practice Mode ---
  makeStep(
    '.standard-modes-container .mode-box:first-child',
    'Let\'s first check out Practice Mode. CLICK THIS BOX NOW to continue the tutorial. The tutorial will wait for you on the Practice screen.',
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

// Define practice steps with much more detail
const practiceSteps = [
  // --- Welcome to Practice Mode ---
  makeStep(
    'body',
    'Great! Now you\'re in Practice Mode. Here you can practice typing without competing against others.',
    'center',
    { delay: 600 }
  ),

  // --- Test Configurator Introduction ---
  makeStep(
    '.test-configurator',
    'This is the Test Configurator where you can customize your practice session.',
    'top', 
    { 
      delay: 500,
      styles: {
        spotlight: {
          borderRadius: '8px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)'
        }
      }
    }
  ),

  // --- Snippet Mode Explanation ---
  makeStep(
    '.config-section.mode-selection .config-button:first-child',
    'Snippet Mode is selected by default. In this mode, you\'ll type real Princeton course evaluations. This helps you see what other students think while practicing your typing!',
    'bottom',
    {
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }
    }
  ),

  // --- Timed Mode Explanation & Forced Click ---
  makeStep(
    '.config-section.mode-selection .config-button:nth-child(2)', 
    'Timed Mode lets you practice typing for a set duration. Click this button to switch modes and see the timed options.',
    'bottom',
    { 
      spotlightClicks: true,
      hideCloseButton: true,
      hideBackButton: true,
      disableOverlayClose: true,
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        },
        options: {
          primaryColor: '#ff7700', // Use distinct color for interaction steps
        },
        tooltip: {
          backgroundColor: '#fef9e3',
        }
      }
    }
  ),

  // --- Duration Selection ---
  makeStep(
    '.duration-selection-inner',
    'Choose how long you want to type: 15, 30, 60, or 120 seconds. Your scores in timed mode will appear on the leaderboard.',
    'bottom',
    {
      delay: 300, // Give options time to appear
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }
    }
  ),

  // --- Back to Snippet Mode & Forced Click ---
  makeStep(
    '.config-section.mode-selection .config-button:first-child',
    'Let\'s go back to Snippet Mode to try typing a course evaluation. Click the Snippet button to continue.',
    'bottom',
    { 
      spotlightClicks: true,
      hideCloseButton: true,
      hideBackButton: true,
      disableOverlayClose: true,
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        },
        options: {
          primaryColor: '#ff7700', // Use distinct color
        },
        tooltip: {
          backgroundColor: '#fef9e3',
        }
      }
    }
  ),

  // --- Snippet Filters ---
  makeStep(
    '.snippet-options',
    'Here you can filter snippets by difficulty, type (general or course reviews), and department for course reviews.',
    'top',
    { 
      delay: 300, // Short delay for options to be visible
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px'
        }
      }
    }
  ),

  // --- Leaderboard Button ---
  makeStep(
    '.leaderboard-button-section',
    'The leaderboard button shows top typing scores from timed mode tests. We\'ll look at this more later.',
    'bottom',
    {
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }
    }
  ),

  // --- Race Content Area ---
  makeStep(
    '.race-content',
    'This area shows the text you need to type. Let\'s learn how the typing works in TigerType.',
    'top',
    {
      delay: 500, // Add delay for content to load
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px'
        }
      }
    }
  ),

  // --- Typing Input - Target Textarea ---
  makeStep(
    '.race-input-area textarea', // Target the textarea directly
    'Click inside this input area to focus it and begin typing.',
    'bottom',
    { 
      spotlightClicks: true,
      disableOverlayClose: true,
      delay: 600, // Increased delay for textarea to be ready
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }
    }
  ),

  // --- Typing Instructions - 1 ---
  makeStep(
    '.race-input-area textarea', 
    'Start typing the text exactly as shown. Type the first few words correctly.',
    'bottom',
    {
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }
    }
  ),

  // --- Making Mistakes Explanation ---
  makeStep(
    '.race-input-area textarea',
    'Now, intentionally type an INCORRECT letter to see what happens. Notice the text turns RED.',
    'bottom',
    {
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }
    }
  ),

  // --- Fixing Mistakes Explanation ---
  makeStep(
    '.race-input-area textarea',
    'You MUST fix mistakes before continuing. Press BACKSPACE to erase the error, then type the correct letter.',
    'bottom',
    {
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }
    }
  ),

  // --- Typing Mechanics ---
  makeStep(
    '.race-input-area textarea', 
    'As you type correctly, your progress is tracked with real-time WPM (Words Per Minute) and accuracy statistics. Continue typing to see the stats update.',
    'bottom',
    {
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }
    }
  ),

  // --- Results Screen Explanation ---
  makeStep(
    '.results-container', // Assume results are shown in a container after typing
    'When you finish typing, you\'ll see your results including WPM, accuracy, and other statistics. For course evaluations, you might also see course details.',
    'top',
    {
      delay: 1000, // Delay for results to appear
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px'
        }
      }
    }
  ),

  // --- Back to Home & Forced Click ---
  makeStep(
    '.back-button',
    'Click the Back button to return to the home screen and explore other features.',
    'bottom',
    { 
      spotlightClicks: true,
      hideCloseButton: true,
      hideBackButton: true,
      disableOverlayClose: true,
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        },
        options: {
          primaryColor: '#ff7700',
        }
      }
    }
  ),
];

// Define home return steps and quick match steps
const furtherSteps = [
  // --- Back on Home Screen ---
  makeStep(
    'body',
    'Welcome back to the home screen! Now let\'s check out the multiplayer racing features.',
    'center',
    { delay: 500 }
  ),

  // --- Quick Match Explained ---
  makeStep(
    '.standard-modes-container .mode-box:nth-child(2)',
    'Quick Match puts you in a public lobby. You need at least 2 players to start a race. Each player must click "Ready" to begin.',
    'bottom'
  ),

  // --- Private Lobby Creation ---
  makeStep(
    '.private-modes-stack .mode-box:first-child',
    'Create Private Lobby gives you a code to share with friends. Only people with this code can join your lobby.',
    'top'
  ),

  // --- Leaderboard Nav Link & Forced Click ---
  makeStep(
    '#leaderboard-nav-link',
    'Click the Leaderboard link in the navbar to see top scores from timed mode tests.',
    'bottom',
    { 
      spotlightClicks: true,
      disableOverlayClose: true,
      hideBackButton: true,
      hideCloseButton: true,
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

  // --- Leaderboard Explanation ---
  makeStep(
    '.leaderboard-modal',
    'The leaderboard shows the best WPM scores achieved in different timed test durations (15s, 30s, 60s, 120s). Close this modal when you are done.',
    'center',
    { delay: 700 }
  ),

  // --- Profile Widget & Forced Click ---
  makeStep(
    '.profile-widget',
    'Click your profile picture or NetID to view and edit your profile details.',
    'bottom',
    { 
      spotlightClicks: true,
      disableOverlayClose: true,
      hideBackButton: true,
      hideCloseButton: true,
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

  // --- Profile Page ---
  makeStep(
    '.profile-page-container',
    'On your profile page, you can upload a custom avatar and edit your bio to show other players.',
    'top',
    { delay: 500 }
  ),

  // --- Settings Explanation ---
  makeStep(
    '.navbar-settings-icon',
    'The settings button lets you customize your TigerType experience, including sound effects, input behavior, and appearance.',
    'bottom'
  ),

  // --- Tutorial Replay Button ---
  makeStep(
    '.tutorial-replay-button',
    'You can replay this tutorial anytime by clicking this question mark button in the navbar.',
    'bottom'
  ),

  // --- End ---
  makeStep(
    'body',
    'That covers all the main features of TigerType! Remember to practice regularly to improve your typing speed and accuracy. Happy typing!',
    'center'
  ),
];

const TutorialGuide = ({ isTutorialRunning, handleTutorialEnd }) => {
  const { markTutorialComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [currentPath, setCurrentPath] = useState(location.pathname); 
  const [currentSection, setCurrentSection] = useState('home'); 
  const [isJoyrideRunningInternal, setIsJoyrideRunningInternal] = useState(false);

  // Effect to sync external running state with internal state
  useEffect(() => {
    setIsJoyrideRunningInternal(isTutorialRunning);
    if (isTutorialRunning) {
      // Reset logic when tutorial is started externally
      const path = location.pathname;
      let initialSection = 'home';
      if (path === '/race') initialSection = 'practice';
      else if (path === '/profile') initialSection = 'further';

      setCurrentSection(initialSection);
      setStepIndex(0);
      console.log(`Tutorial externally started/replayed on path ${path}, resetting to section ${initialSection} at step 0`);
    }
  }, [isTutorialRunning]);

  // Effect to handle navigation changes
  useEffect(() => {
    const path = location.pathname;
    // Only update section/step if the path actually changes
    if (path !== currentPath) {
      const previousPath = currentPath;
      setCurrentPath(path);
      console.log('TutorialGuide: Path changed from', previousPath, 'to', path);

      // Only adjust section/step if the tutorial is internally running
      if (isJoyrideRunningInternal) {
        let newSection = currentSection;
        let newStepIndex = 0; // Default to resetting step index on section change
        let sectionChanged = false;

        if (previousPath === '/home' && path === '/race') {
          newSection = 'practice';
          sectionChanged = true;
        } else if (previousPath === '/race' && path === '/home') {
          newSection = 'further';
          sectionChanged = true;
        } else if (previousPath !== '/home' && path === '/home' && currentSection !== 'home') {
          newSection = 'further'; 
          sectionChanged = true;
        } else if (path === '/profile' && currentSection !== 'further') {
           newSection = 'further';
           const profileStepIndex = furtherSteps.findIndex(step => step.target === '.profile-page-container');
           newStepIndex = profileStepIndex >= 0 ? profileStepIndex : 0; // Start at profile step
           sectionChanged = true;
        }
        
        if (sectionChanged) {
          console.log(`Navigation detected: ${previousPath} -> ${path}. Switching to section ${newSection} at step ${newStepIndex}`);
          setCurrentSection(newSection);
          setStepIndex(newStepIndex);
        }
      }
    }
  }, [location.pathname, isJoyrideRunningInternal, currentPath]); // Add currentPath dependency

  // Get the appropriate steps based on current section
  const getActiveSteps = () => {
    switch(currentSection) {
      case 'practice': return practiceSteps;
      case 'further': return furtherSteps;
      case 'home':
      default: return homeSteps;
    }
  };

  // Handle Joyride callback events
  const handleJoyrideCallback = (data) => {
    const { status, action, index, type, lifecycle } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    console.log(`Joyride callback: Index: ${index}, Status: ${status}, Type: ${type}, Action: ${action}, Lifecycle: ${lifecycle}, Section: ${currentSection}`);

    // Update stepIndex for tracking progress
    if ((type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) && action !== ACTIONS.CLOSE) {
        const newStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
        // Prevent advancing past the last step
        if (newStepIndex >= 0 && newStepIndex < getActiveSteps().length) {
           setStepIndex(newStepIndex);
           console.log(`Advanced to step ${newStepIndex} in section ${currentSection}`);
        } else if (newStepIndex >= getActiveSteps().length && status !== STATUS.FINISHED) {
          console.log(`Attempted to advance past last step (${getActiveSteps().length -1}) in section ${currentSection}.`);
          // If this happens and it's not the final section, could transition or end.
          // For now, just log. It might indicate a logic flaw if a section ends unexpectedly.
        }
    }

    // Handle tutorial completion
    if (finishedStatuses.includes(status)) {
      console.log('Tutorial finished or skipped via Joyride status. Marking as complete...');
      setIsJoyrideRunningInternal(false); // Stop internal tracking
      markTutorialComplete();
      handleTutorialEnd(); // Call parent handler to update external state
    } 
    // Handle target not found errors gracefully
    else if (type === EVENTS.TARGET_NOT_FOUND) {
      const target = getActiveSteps()[index]?.target;
      console.warn(`Target not found for step ${index} in ${currentSection}: ${target}`);
      
      // Skip this step instead of ending the tutorial
      if (getActiveSteps().length > index + 1) {
        console.log('Target not found, skipping to next step');
        setStepIndex(index + 1);
      } else {
        console.log('No more steps available after target not found, ending tutorial section');
        // If we're in the final section, end the tutorial
        if (currentSection === 'further') {
          setIsJoyrideRunningInternal(false);
          handleTutorialEnd();
        }
      }
    } 
    else if (type === EVENTS.ERROR) {
      console.error('Joyride error:', data);
      setIsJoyrideRunningInternal(false);
      handleTutorialEnd();
    }
  };

  const steps = getActiveSteps();
  
  return (
    <>
      {/* Removed repetitive render log */}
      <Joyride
        // key={`tutorial-${currentSection}`} // Simplify key or remove if still causing issues
        steps={steps}
        stepIndex={stepIndex}
        run={isJoyrideRunningInternal} // Control Joyride with internal state
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        debug={true}
        disableOverlayClose={false}
        disableCloseOnEsc={false}
        styles={{
          options: {
            primaryColor: '#E77500',
            textColor: '#333',
            zIndex: 10000,
            arrowColor: '#fef9e3'
          },
          spotlight: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          },
          tooltip: {
            fontSize: '15px',
            padding: '15px',
            maxWidth: '420px',
            backgroundColor: '#fef9e3',
            color: '#333',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)'
          },
          tooltipContainer: {
            textAlign: 'center'
          },
          buttonNext: {
            backgroundColor: '#E77500',
            fontSize: '14px',
            padding: '8px 15px'
          },
          buttonBack: {
            color: '#555',
            fontSize: '14px',
            padding: '8px 15px'
          }
        }}
      />
    </>
  );
};

export default TutorialGuide; 