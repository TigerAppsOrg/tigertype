import React, { useState, useEffect, useRef } from 'react';
import './TutorialGuide.css';
import Joyride, { STATUS, ACTIONS, EVENTS, LIFECYCLE } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTutorial } from '../context/TutorialContext';
import { useRace } from '../context/RaceContext'; // Import useRace for typing simulation

// Helper function to create a step object
const makeStep = (target, content, placement = 'bottom', extra = {}) => ({
  target,
  content,
  placement,
  disableBeacon: true,
  disableOverlayClose: true,
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
    'Let\'s first check out Practice Mode. Click the Solo Practice Mode button to continue the tutorial. The tutorial will wait for you on the Practice screen.',
    'bottom',
    { 
      spotlightClicks: true,
      hideCloseButton: true,
      hideBackButton: true
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
    { delay: 500 }
  ),

  // --- Snippet Mode Explanation ---
  makeStep(
    '[data-testid="mode-snippet"]',
    'Snippet Mode is selected by default. In this mode, you\'ll type real Princeton course evaluations. This helps you see what other students think while practicing your typing!',
    'bottom',
    {
      spotlightClicks: true,
      hideCloseButton: true,
      hideBackButton: true,
      disableOverlayClose: true,
      styles: {
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }
    }
  ),

  // --- Timed Mode Explanation ---
  makeStep(
    '[data-testid="mode-timed"]', 
    'Timed Mode lets you practice typing for a set duration. Click this button to switch modes and see the timed options.',
    'bottom',
    { 
      spotlightClicks: true,
      hideCloseButton: true,
      hideBackButton: true,
      disableOverlayClose: true
    }
  ),

  // --- Duration Selection ---
  makeStep(
    '.duration-selection-inner',
    'Choose how long you want to type: 15, 30, 60, or 120 seconds. Your scores in timed mode will appear on the leaderboard.',
    'bottom',
    { delay: 300 }
  ),

  // --- Back to Snippet Mode ---
  makeStep(
    '[data-testid="mode-snippet"]',
    'Let\'s go back to Snippet Mode to try typing a course evaluation. Click the Snippet button to continue.',
    'bottom',
    { 
      spotlightClicks: true,
      hideCloseButton: true,
      hideBackButton: true,
      disableOverlayClose: true
    }
  ),

  // --- Snippet Filters ---
  makeStep(
    '.snippet-options',
    'Here you can filter snippets by difficulty, type (general or course reviews), and department for course reviews.',
    'top',
    { delay: 300 }
  ),

  // --- Leaderboard Button ---
  makeStep(
    '.leaderboard-button-section',
    'The leaderboard button shows top typing scores from timed mode tests. We\'ll look at this more later.',
    'bottom'
  ),

  // --- Race Content Area ---
  makeStep(
    '.race-content',
    'This area shows the text you need to type. The text you need to type will be highlighted as you go.',
    'top',
    { delay: 500 }
  ),

  // --- Typing Input (First Focus) ---
  makeStep(
    '.typing-input-container',
    'Click here to focus the input area. The tutorial will guide you through typing a few characters.',
    'bottom',
    { 
      spotlightClicks: true,
      disableOverlayClose: false,
      hideCloseButton: false,
      styles: { 
        spotlight: { backgroundColor: 'rgba(0, 0, 0, 0.3)' }
      }
    }
  ),

  // --- Start Typing Guidance ---
  makeStep(
    '.snippet-display',
    'Start typing the first few letters shown. After you type a few characters correctly, you\'ll see what happens when you make a mistake.',
    'top',
    {
      disableOverlayClose: false,
      styles: { 
        overlay: { opacity: 0.3, pointerEvents: 'none' }
      }
    }
  ),

  // --- Mistake Experience --- 
  makeStep(
    '.snippet-display',
    'Notice that the text turned red! This happens when you make a mistake. Click Next to learn how to correct it.',
    'top',
    {
      disableOverlayClose: false,
      styles: { 
        overlay: { opacity: 0.3, pointerEvents: 'none' }
      }
    }
  ),

  // --- Fix Error Instruction ---
  makeStep(
    '.typing-input-container',
    'To fix a mistake, press the Backspace key to delete the error, then type the correct letter. Try it now - you\'ll need to fix the error to continue.',
    'bottom',
    {
      disableOverlayClose: false,
      styles: { 
        overlay: { opacity: 0.3, pointerEvents: 'none' }
      }
    }
  ),

  // --- Typing Experience Summary ---
  makeStep(
    '.stats-container', 
    'As you type, your WPM (Words Per Minute) and accuracy are tracked in real-time. Continue typing to see these stats update.',
    'top'
  ),

  // --- Results Explanation ---
  makeStep(
    'body',
    'When you finish typing, you\'ll see your results including WPM, accuracy, and other statistics. For course evaluations, you might also see course details.',
    'center'
  ),

  // --- Back to Home ---
  makeStep(
    '.back-button',
    'Click the Back button to return to the home screen and explore other features.',
    'bottom',
    { 
      spotlightClicks: true,
      disableOverlayClose: true,
      hideCloseButton: true,
      hideBackButton: true
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

  // --- Leaderboard Nav Link ---
  makeStep(
    '#leaderboard-nav-link',
    'Click the Leaderboard link in the navbar to see top scores from timed mode tests.',
    'bottom',
    { 
      spotlightClicks: true,
      disableOverlayClose: true,
      hideBackButton: true,
      hideCloseButton: true
    }
  ),

  // --- Leaderboard Explanation ---
  makeStep(
    '.leaderboard-modal',
    'The leaderboard shows the best WPM scores achieved in different timed test durations (15s, 30s, 60s, 120s). Close this modal when you are done.',
    'center',
    { delay: 700 }
  ),

  // --- Profile Widget ---
  makeStep(
    '.profile-widget',
    'Click your profile picture or NetID to view and edit your profile details.',
    'bottom',
    { 
      spotlightClicks: true,
      disableOverlayClose: true,
      hideBackButton: true,
      hideCloseButton: true
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

const TutorialGuide = () => {
  const { markTutorialComplete } = useAuth();
  const { user } = useAuth(); // Get user for potential future use
  const navigate = useNavigate();
  const location = useLocation();
  const joyrideRef = useRef(null);
  const retryCounts = useRef({}); // Keep retry counts
  const { raceState, setRaceState, typingState, handleInput: raceHandleInput } = useRace(); // Get race context for typing simulation

  // Use centralized state from TutorialContext
  const {
    isRunning,
    currentSection,
    currentStepIndex,
    isPaused,
    errorState,
    startTutorial,
    endTutorial,
    advanceStep,
    goToStep,
    pauseTutorial,
    resumeTutorial,
    determineSection, // Get determineSection from context
    TUTORIAL_SECTIONS
  } = useTutorial();

  // Local state for specific UI interactions within the tutorial guide itself
  const [shouldAutoAdvanceToMode, setShouldAutoAdvanceToMode] = useState(null); // Keep this for mode button clicks

  // Helper to get the current steps array based on context section
  const getActiveSteps = () => {
    switch(currentSection) {
      case 'practice': return practiceSteps;
      case 'further': return furtherSteps;
      case 'home':
      default: return homeSteps;
    }
  };
  
  // Utility function to wait for a target element
  const waitForTarget = async (selector, timeout = 3000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (document.querySelector(selector)) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    console.warn(`[TutorialGuide] Target "${selector}" not found after ${timeout}ms.`);
    return false;
  };

  // Function to guide the user through typing and deliberately make a mistake
  const prepareForTyping = () => {
    // We need different behavior depending on which step we're on
    const currentStep = getActiveSteps()[currentStepIndex];
    const isFirstTypingStep = currentStep?.target === '.typing-input-container';
    const isStartTypingStep = currentStep?.target === '.snippet-display' && currentStep?.content.includes('Start typing');
    const isMistakeStep = currentStep?.content.includes('Notice that the text turned red');
    const isFixErrorStep = currentStep?.content.includes('Backspace key');
    
    // First step: just focus the input
    if (isFirstTypingStep) {
      const inputEl = document.querySelector('.typing-input-container input');
      if (inputEl) {
        // Focus and make sure user can see the cursor
        setTimeout(() => {
          inputEl.focus();
          // Automatically advance to next step after 2 seconds
          setTimeout(() => {
            if (joyrideRef.current && joyrideRef.current.helpers) {
              joyrideRef.current.helpers.next();
            }
          }, 2000);
        }, 500);
      }
    }
    // Second step: help user start typing correctly
    else if (isStartTypingStep) {
      const inputEl = document.querySelector('.typing-input-container input');
      if (inputEl) {
        // Make overlay semi-transparent and allow typing
        const overlay = document.querySelector('.react-joyride__overlay');
        if (overlay) {
          overlay.style.opacity = '0.3';
          overlay.style.pointerEvents = 'none';
        }
        
        // Focus the input element so user can start typing immediately
        inputEl.focus();
        
        // Track if user has typed at least 3 characters correctly
        let hasUserStartedTyping = false;
        let correctCharCount = 0;
        const snippetText = document.querySelector('.snippet-display')?.textContent || '';
        
        // Listen for typing and advance after typing a few characters correctly
        const typingHandler = (e) => {
          hasUserStartedTyping = true;
          const currentInput = inputEl.value;
          const isCorrect = snippetText.startsWith(currentInput);
          
          if (isCorrect) {
            correctCharCount = currentInput.length;
            
            // After typing several characters correctly, deliberately introduce an error
            if (correctCharCount >= 3) {
              // Remove this listener
              inputEl.removeEventListener('input', typingHandler);
              
              // Wait a moment, then simulate a mistake
              setTimeout(() => {
                // Add a wrong character
                inputEl.value = currentInput + 'x';
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Advance to the mistake step
                setTimeout(() => {
                  if (joyrideRef.current && joyrideRef.current.helpers) {
                    joyrideRef.current.helpers.next();
                  }
                }, 1000);
              }, 500);
            }
          }
        };
        
        // Set up the typing handler
        inputEl.addEventListener('input', typingHandler);
        
        // Don't auto-advance - wait for user to type and trigger the handler
      }
    }
    // Third step: show error state
    else if (isMistakeStep) {
      const overlay = document.querySelector('.react-joyride__overlay');
      if (overlay) {
        overlay.style.opacity = '0.3';
        overlay.style.pointerEvents = 'none';
      }
      
      // Focus the input again
      const inputEl = document.querySelector('.typing-input-container input');
      if (inputEl) {
        inputEl.focus();
      }
      
      // Do NOT advance automatically - let user see the error for as long as they want
      // They'll need to click Next to continue
    }
    // Fourth step: guide user to fix the error
    else if (isFixErrorStep) {
      const inputEl = document.querySelector('.typing-input-container input');
      const overlay = document.querySelector('.react-joyride__overlay');
      
      if (overlay) {
        overlay.style.opacity = '0.3';
        overlay.style.pointerEvents = 'none';
      }
      
      if (inputEl) {
        inputEl.focus();
        
        // Listen for backspace and correct typing
        const fixHandler = (e) => {
          const currentInput = inputEl.value;
          const snippetText = document.querySelector('.snippet-display')?.textContent || '';
          
          // Check if error is fixed (user backspaced and typed correct character)
          if (snippetText.startsWith(currentInput) && currentInput.length >= 4) {
            // Remove this listener
            inputEl.removeEventListener('input', fixHandler);
            
            // Advance to next step after they fix the error
            setTimeout(() => {
              if (joyrideRef.current && joyrideRef.current.helpers) {
                joyrideRef.current.helpers.next();
              }
            }, 1000);
          }
        };
        
        // Set up the fix error handler
        inputEl.addEventListener('input', fixHandler);
      }
    }
  };

  // Effect to enable clicking through tutorial overlay when in typing steps
  useEffect(() => {
    if (!isRunning) return; // Only run if tutorial is active
    const currentStep = getActiveSteps()[currentStepIndex];
    const isTypingStep = currentStep?.target.includes('typing');

    const overlay = document.querySelector('.react-joyride__overlay');
    if (overlay && isTypingStep) {
      overlay.style.pointerEvents = 'none';
    } else if (overlay) {
      overlay.style.pointerEvents = 'auto';
    }
    
    return () => {
      const overlay = document.querySelector('.react-joyride__overlay');
      if (overlay) {
        overlay.style.pointerEvents = 'auto';
      }
    };
  }, [currentStepIndex, currentSection, isRunning]); // Add isRunning dependency

  // Check if mode buttons are clicked and auto-advance
  useEffect(() => {
    if (!isRunning || !shouldAutoAdvanceToMode) return; // Use context isRunning
    
    const handleModeClick = (e) => {
      const target = e.target.closest(`[data-testid="${shouldAutoAdvanceToMode}"]`);
      if (target) {
        // Reset auto-advance state
        setShouldAutoAdvanceToMode(null);
        
        // Wait for mode switch animation
        setTimeout(() => {
          if (joyrideRef.current && joyrideRef.current.helpers) {
            joyrideRef.current.helpers.next();
          }
        }, 300);
      }
    };
    document.addEventListener('click', handleModeClick);
    return () => document.removeEventListener('click', handleModeClick);
  }, [shouldAutoAdvanceToMode, isRunning]); // Use context isRunning

  // Effect to handle navigation changes using location hook here
  useEffect(() => {
    if (!isRunning) return; // Only handle navigation if tutorial is running

    const newPath = location.pathname;
    const expectedSection = determineSection(newPath); // Use context function
    console.log(`[TutorialGuide] Navigation detected. New path: ${newPath}, Current section: ${currentSection}, Expected section: ${expectedSection}`);

    if (expectedSection !== currentSection) {
      // Logic to determine the correct step index when changing sections
      let newStepIndex = 0;
      // Example: If navigating from home to race, start practice section at step 0
      if (currentSection === 'home' && expectedSection === 'practice') {
        newStepIndex = 0;
      }
      // Example: If navigating from race back to home, start further section at step 0
      else if (currentSection === 'practice' && (expectedSection === 'further' || expectedSection === 'home')) {
         // Assuming 'further' steps start after practice, reset to 0 for 'further'
         // Need to refine this based on exact flow between practice -> home -> further
         goToStep('further', 0); // Explicitly go to 'further' section
         return; // Exit early as goToStep handles state update
      }
      // Example: Navigating to profile page should target the correct step in 'further'
      else if (expectedSection === 'profile') {
         // Find the index of the profile page step in the 'further' section
         const profileStepIndex = furtherSteps.findIndex(step => step.target === '.profile-page-container');
         newStepIndex = profileStepIndex >= 0 ? profileStepIndex : 0;
         goToStep('further', newStepIndex); // Go to 'further' section at the profile step
         return; // Exit early
      }
      // Add more specific transition logic here based on your step definitions
      // ...

      console.log(`[TutorialGuide] Section changed from ${currentSection} to ${expectedSection}. Setting step to ${newStepIndex}.`);
       goToStep(expectedSection, newStepIndex); // Use goToStep to handle state update
     } else {
       // Still in the same section. Only resume if paused for a reason *other* than target not found.
       // If paused for target not found, let the TARGET_NOT_FOUND handler manage retries/pausing.
       if (isPaused && !errorState?.startsWith('Target not found')) {
         console.log(`[TutorialGuide] Resuming tutorial in section ${currentSection} after navigation (pause reason: ${errorState}).`);
         resumeTutorial();
       } else if (isPaused) {
         console.log(`[TutorialGuide] Tutorial remains paused in section ${currentSection} after navigation (pause reason: ${errorState}).`);
       }
     }
   }, [location.pathname, isRunning, currentSection, isPaused, errorState, determineSection, goToStep, resumeTutorial]); // Added errorState dependency

  // Handle Joyride callback events - Refactored to use context
  const handleJoyrideCallback = async (data) => {
    const { status, action, index, type, lifecycle, step } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    const currentSteps = getActiveSteps(); // Get steps for the current section

    console.log(`[TutorialGuide] Joyride CB: Idx:${index}, Status:${status}, Type:${type}, Action:${action}, Lifecycle:${lifecycle}, Section:${currentSection}, StepTarget:${step?.target}`);

    // --- Step Before: Validate target and prepare step ---
    if (type === EVENTS.STEP_BEFORE && lifecycle === LIFECYCLE.READY) {
      console.log(`[TutorialGuide] STEP_BEFORE: Preparing step ${index} in section ${currentSection}`);
      
      // 1. Validate Target Existence with Retry
      const targetExists = await waitForTarget(step.target);
      if (!targetExists) {
        // Target not found after waiting, pause the tutorial
        console.error(`[TutorialGuide] Target "${step.target}" for step ${index} not found after waiting. Pausing.`);
        pauseTutorial(`Target not found: ${step.target}`);
        // Optionally, show a message to the user here
        return; // Stop processing this callback
      }
      
      // 2. Reset retry count if target is found
      const key = `${currentSection}-${index}`;
      retryCounts.current[key] = 0;

      // 3. Prepare specific step types (mode buttons, typing)
      if (step.target === '[data-testid="mode-timed"]') {
        console.log('[TutorialGuide] Setting auto-advance for timed mode');
        setShouldAutoAdvanceToMode('mode-timed');
      } else if (step.target === '[data-testid="mode-snippet"]' && index > 3) { // Assuming index > 3 means it's the "back to snippet" step
        console.log('[TutorialGuide] Setting auto-advance for snippet mode');
        setShouldAutoAdvanceToMode('mode-snippet');
      } else if (
        step.target === '.typing-input-container' ||
        step.target === '.snippet-display' ||
        step.content.includes('Backspace key') ||
        step.content.includes('text turned red')
      ) {
        console.log('[TutorialGuide] Preparing for typing step:', step.target);
        // Ensure input is focused before preparing
        const inputEl = document.querySelector('.typing-input-container input');
        if (inputEl) inputEl.focus();
        setTimeout(prepareForTyping, 300); // Slight delay after focus
      }
    }

    // --- Target Click: Handle specific interactions ---
    if (type === EVENTS.TARGET_CLICK) {
      console.log('[TutorialGuide] TARGET_CLICK:', step?.target);
      // Let mode button click handler manage advancement
      if (step?.target.includes('data-testid="mode-')) {
        return; // Prevent default advancement
      }
      // Handle other spotlight clicks if needed, otherwise let Joyride advance
    }

    // --- Step After: Update context state ---
    if (type === EVENTS.STEP_AFTER && action !== ACTIONS.CLOSE) {
       console.log(`[TutorialGuide] STEP_AFTER: Action: ${action}, Current Index: ${index}`);
       if (action === ACTIONS.NEXT || action === ACTIONS.PREV) {
         // Use context function to advance/go back
         // Note: Joyride's index is the *previous* step index here
         const nextIndex = index + (action === ACTIONS.NEXT ? 1 : -1);
         if (nextIndex >= 0 && nextIndex < currentSteps.length) {
            // Check if we are crossing section boundaries (if applicable)
            // For now, assume advancement within the same section
            goToStep(currentSection, nextIndex); 
         } else if (nextIndex >= currentSteps.length) {
            console.log(`[TutorialGuide] Reached end of section ${currentSection}.`);
            // Handle section completion or end of tutorial
            // This might involve navigating or calling endTutorial()
            // For now, just end the tutorial if it's the last step of the last section
            if (currentSection === 'further' && index === currentSteps.length - 1) {
               endTutorial();
               markTutorialComplete();
            } else {
               // TODO: Add logic for transitioning between sections if needed
               console.warn("[TutorialGuide] Section transition logic not fully implemented.");
               // As a fallback, end the tutorial if we advance past the last step
               endTutorial();
               markTutorialComplete();
            }
         }
       }
    }

    // --- Error Handling: Target Not Found ---
    if (type === EVENTS.TARGET_NOT_FOUND) {
      const targetSelector = step?.target || currentSteps[index]?.target;
      console.warn(`[TutorialGuide] TARGET_NOT_FOUND received for Step ${index}, Target: ${targetSelector}`);

      // Check if the target exists *now* (maybe it appeared late)
      if (document.querySelector(targetSelector)) {
        console.log(`[TutorialGuide] Target ${targetSelector} found now. Retrying step ${index}.`);
        // Force Joyride to re-render the same step
        if (joyrideRef.current && joyrideRef.current.helpers) {
          joyrideRef.current.helpers.go(index);
        }
        // Ensure tutorial is not paused if it was previously
        if (isPaused) resumeTutorial();
      } else {
        // Target still not found, pause the tutorial
        console.error(`[TutorialGuide] Target ${targetSelector} still not found. Pausing.`);
        pauseTutorial(`Target not found: ${targetSelector}`);
      }
      return; // Stop further processing in this callback for this event
    }

    // --- Error Handling: General Joyride Errors ---
    if (type === EVENTS.ERROR) {
      console.error('[TutorialGuide] Joyride reported an error:', data);
      pauseTutorial(`Joyride error: ${data.error?.message || 'Unknown error'}`);
      // Optionally end tutorial or show error message
      endTutorial(); // End tutorial on unexpected errors
    }

    // --- Tutorial Finish/Skip ---
    if (finishedStatuses.includes(status)) {
      console.log('[TutorialGuide] Tutorial finished or skipped.');
      endTutorial();
      markTutorialComplete(); // Mark as complete in AuthContext
    }
  };

  const steps = getActiveSteps();

  // Render Joyride only if isRunning is true
  if (!isRunning) return null;

  return (
    <>
      {/* Optionally display a message if the tutorial is paused */}
      {isPaused && (
         <div style={{ position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255, 0, 0, 0.8)', color: 'white', padding: '10px 20px', borderRadius: '5px', zIndex: 100001 }}>
           Tutorial Paused: {errorState || 'Waiting for correct state...'}
           {/* Add a button to manually resume if needed */}
           {/* <button onClick={resumeTutorial}>Resume</button> */}
         </div>
      )}
      <Joyride
        ref={joyrideRef}
        steps={steps}
        stepIndex={currentStepIndex} // Use context stepIndex
        run={isRunning && !isPaused} // Run only if running and not paused
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        debug={false}
        disableOverlayClose={false}
        disableCloseOnEsc={false}
        floaterProps={{
          disableAnimation: true,
        }}
        spotlightPadding={8}
        styles={{
          options: {
            overlayColor: 'rgba(0, 0, 0, 0.2)',
            backgroundColor: '#181818',
            primaryColor: '#E77500',
            textColor: '#ffb366',
            zIndex: 100000,
          },
          overlay: {
            mixBlendMode: 'normal',
            opacity: 0.4,
          },
          tooltip: {
            opacity: 1,
          }
        }}
        locale={{
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip',
          back: 'Back'
        }}
      />
    </>
  );
};

export default TutorialGuide;
