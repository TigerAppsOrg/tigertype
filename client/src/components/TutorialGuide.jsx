import React from 'react';
import Joyride from 'react-joyride';
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

  const prevSectionRef = React.useRef(currentSection);
  React.useEffect(() => {
    if (prevSectionRef.current !== currentSection) {
      prevSectionRef.current = currentSection;
    }
  }, [currentSection]);

  // Auto switch tutorial section based on current route while running
  React.useEffect(() => {
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

  if (!isRunning) return null;

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
        callback={({ type, action, index, status }) => {
          if (type === 'step:after') {
            // Handle immediate close within step:after (clicking the “X” icon)
            if (action === 'close') {
              endTutorial();
              return;
            }
            if (action === 'next') {
              const currentStepConfig = rawSteps[index];

              // Special handling for timed mode switch
              if (currentStepConfig?.id === 'practice-mode-timed') {
                console.log('Programmatically clicking Timed mode button');
                const btn = document.querySelector('[data-tutorial-id="mode-timed"]');
                if (btn) btn.click();
              }
              if (currentStepConfig?.id === 'practice-mode-snippet') {
                console.log('Programmatically clicking Snippet mode button');
                const btn = document.querySelector('[data-tutorial-id="mode-snippet"]');
                if (btn) btn.click();
              }

              if (index + 1 < steps.length) {
                nextStep();
              } else {
                // advance section
                if (currentSection === 'home') {
                  goToSection('practice');
                } else if (currentSection === 'practice') {
                  goToSection('further');
                } else {
                  endTutorial();
                }
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
              // After exhausting retries, skip step to avoid tutorial hang
              if (index + 1 < steps.length) nextStep();
              else {
                if (currentSection === 'home') goToSection('practice');
                else endTutorial();
              }
            }
          }
          // Handle user closing via “X”, Skip, or finishing the tour
          else if (
            action === 'close' ||
            type === 'tooltip:close' ||
            (type === 'tooltip:before' && action === 'close') ||
            type === 'close' ||
            type === 'tour:end' ||
            action === 'skip' ||
            status === 'finished'
          ) {
            endTutorial();
          }
        }}
      />
  );
};

export default TutorialGuide;
