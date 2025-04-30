import React, { useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useTutorial } from '../context/TutorialContext';
import { tutorialSteps } from '../tutorial/tutorialSteps';
import './TutorialGuide.css';
import { useAnchorContext } from './TutorialAnchor';
import { useLocation } from 'react-router-dom';
import { useRace } from '../context/RaceContext';

const TutorialGuide = () => {
  const { isRunning, currentSection, currentStepIndex, nextStep, prevStep, goToSection, endTutorial } = useTutorial();
  const { anchors } = useAnchorContext();
  const location = useLocation();
  const { setConfigTestMode } = useRace();
  
  // fetch raw step configs per section
  const rawSteps = tutorialSteps[currentSection] || [];
  
  // Build Joyride steps using CSS selectors (data-tutorial-id)
  const steps = rawSteps.map(step => ({
    target: step.anchorId === 'body'
      ? 'body'
      : `[data-tutorial-id="${step.anchorId}"]`,
    content: step.content,
    disableBeacon: true,
    disableOverlayClose: true,
    spotlightClicks: !!step.spotlightClicks,
    placement: step.placement || 'bottom'
  }));

  // Wait until first step's target is present before running
  const first = rawSteps[0];
  const hasFirst = first ? (first.anchorId === 'body' || document.querySelector(`[data-tutorial-id="${first.anchorId}"]`)) : true;

  const joyrideRun = isRunning && hasFirst;

  // Track how many times we've retried a missing target for each step
  const retryCountsRef = React.useRef({});
  
  // Check if we're on the last step of any section
  const isLastStep = currentStepIndex === steps.length - 1;
  
  // Store whether we've seen the last step button to make sure we don't restart
  const lastStepSeenRef = React.useRef(false);
  
  // Reset reference when section changes
  useEffect(() => {
    lastStepSeenRef.current = false;
  }, [currentSection]);

  // Auto switch tutorial section based on current route
  useEffect(() => {
    if (!isRunning) return;
    if (location.pathname.startsWith('/race')) {
      if (currentSection !== 'practice') {
        goToSection('practice', 0);
      }
    } else if (location.pathname.startsWith('/home')) {
      if (currentSection !== 'home') {
        goToSection('home', 0);
      }
    }
  }, [location.pathname, isRunning, currentSection, goToSection]);

  // This effect monitors for the last step condition
  useEffect(() => {
    if (isRunning && isLastStep && !lastStepSeenRef.current) {
      lastStepSeenRef.current = true;
    }
  }, [isRunning, isLastStep, currentSection]);

  if (!isRunning) return null;

  const handleJoyrideCallback = (data) => {
    const { type, action, index, status } = data;
    
    // End tutorial immediately if status is FINISHED
    if (status === STATUS.FINISHED) {
      endTutorial();
      return;
    }
    
    // Handle user closing via any close action
    if (
      action === 'close' || 
      type === 'tooltip:close' || 
      (type === 'tooltip:before' && action === 'close') || 
      type === 'close' || 
      type === 'tour:end' || 
      action === 'skip'
    ) {
      endTutorial();
      return;
    }
    
    // Special case: when user clicks "Finish" button on the last step
    if (type === 'step:after' && index === steps.length - 1) {
      if (action === 'next' || action === 'primary') {
        // This is the key fix - we don't proceed to the next section,
        // just end the tutorial immediately
        endTutorial();
        return;
      }
    }
    
    // Normal navigation through steps
    if (type === 'step:after') {
      if (action === 'next') {
        const currentStepConfig = rawSteps[index];

        // Special handling for timed mode switch
        if (currentStepConfig?.id === 'practice-mode-timed') {
          const btn = document.querySelector('[data-tutorial-id="mode-timed"]');
          if (btn) btn.click();
        }
        if (currentStepConfig?.id === 'practice-mode-snippet') {
          const btn = document.querySelector('[data-tutorial-id="mode-snippet"]');
          if (btn) btn.click();
        }

        // If more steps in this section, go to next step
        if (index + 1 < steps.length) {
          nextStep();
        } 
        // If we're at the end of the section, DO NOT proceed to next section
        // Instead just end the tutorial
        else {
          endTutorial();
        }
      } else if (action === 'prev') {
        if (index > 0) prevStep();
      }
    }
    else if (type === 'error:target_not_found' || type === 'target:notFound') {
      // Retry up to 3× with 250 ms delay to give the DOM time to render the target
      const retries = retryCountsRef.current[index] || 0;
      if (retries < 3) {
        retryCountsRef.current[index] = retries + 1;
        setTimeout(() => {
          goToSection(currentSection, index); // re-trigger Joyride for same step
        }, 250);
      } else {
        // After exhausting retries, end the tutorial to avoid hang
        endTutorial();
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      key={currentSection}
      stepIndex={currentStepIndex}
      run={joyrideRun}
      continuous
      showSkipButton
      showCloseButton
      showProgress
      disableOverlayClose
      spotlightClicks
      locale={{ last: 'Finish' }}
      styles={{
        spotlight: {
          boxShadow: '0 0 0 4px #E77500, 0 0 16px 8px #F58025, 0 0 0 9999px rgba(0,0,0,0.7)',
          outline: '2.5px solid #F58025',
          outlineOffset: '2px',
          borderRadius: '12px',
          pointerEvents: 'none !important'
        },
        overlay: {
          backgroundColor: 'rgba(10,10,10,0.2)',
          pointerEvents: 'none'
        },
        options: { primaryColor: '#E77500', textColor: '#ffb366', zIndex: 100000 }
      }}
      callback={handleJoyrideCallback}
    />
  );
};

export default TutorialGuide;
