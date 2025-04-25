import React, { createContext, useContext, useState, useCallback } from 'react';

// TutorialContext provides a simple API for running step-by-step tutorials.
const TutorialContext = createContext(null);

export const TutorialProvider = ({ children }) => {
  // Whether tutorial is active
  const [isRunning, setIsRunning] = useState(false);
  // Current section: 'home', 'practice', or 'further'
  const [currentSection, setCurrentSection] = useState('home');
  // Current step index within the section
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Start the tutorial at the home section
  const startTutorial = useCallback((section = 'home') => {
    if (isRunning) return;
    setCurrentSection(section);
    setCurrentStepIndex(0);
    setIsRunning(true);
  }, [isRunning]);

  // End the tutorial and reset state
  const endTutorial = useCallback(() => {
    setIsRunning(false);
    setCurrentSection('home');
    setCurrentStepIndex(0);
    try { localStorage.setItem('tutorial_completed', 'true'); } catch {};
  }, []);

  // Advance to next step
  const nextStep = useCallback((delta = 1) => {
    setCurrentStepIndex(idx => idx + delta);
  }, []);

  // Go back one step
  const prevStep = useCallback(() => {
    setCurrentStepIndex(idx => (idx > 0 ? idx - 1 : 0));
  }, []);

  // Jump to a specific section and step
  const goToSection = useCallback((section, step = 0) => {
    setCurrentSection(section);
    setCurrentStepIndex(step);
  }, []);

  return (
    <TutorialContext.Provider value={{
      isRunning,
      currentSection,
      currentStepIndex,
      startTutorial,
      nextStep,
      prevStep,
      goToSection,
      endTutorial,
    }}>
      {children}
    </TutorialContext.Provider>
  );
};

// Hook for components to access tutorial context
export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
};

export default TutorialContext;
