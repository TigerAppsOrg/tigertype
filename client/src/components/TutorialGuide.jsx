import React from 'react';
import Joyride from 'react-joyride';
import { useTutorial } from '../context/TutorialContext';
import { tutorialSteps } from '../tutorial/tutorialSteps';
import './TutorialGuide.css';
import { useAnchorContext } from './TutorialAnchor';

const TutorialGuide = () => {
  const { isRunning, currentSection, currentStepIndex, nextStep, prevStep, goToSection, endTutorial } = useTutorial();
  const { anchors } = useAnchorContext();
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

  const prevSectionRef = React.useRef(currentSection);
  React.useEffect(() => {
    if (prevSectionRef.current !== currentSection) {
      prevSectionRef.current = currentSection;
    }
  }, [currentSection]);

  if (!isRunning) return null;

  return (
      <Joyride
        steps={steps}
        key={currentSection}
        stepIndex={currentStepIndex}
        run={joyrideRun}
        continuous
        showSkipButton
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
        callback={({ type, action, index }) => {
          if (type === 'step:after') {
            if (action === 'next') {
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
        }}
      />
  );
};

export default TutorialGuide;
