import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// Define tutorial sections and their corresponding routes/entry points
// Exposing this for TutorialGuide to use
export const TUTORIAL_SECTIONS = {
  home: { path: '/home', steps: 6 }, // Update step count based on homeSteps array length
  practice: { path: '/race', steps: 16 }, // Update step count based on practiceSteps array length
  further: { path: '/home', steps: 10 }, // Update step count based on furtherSteps array length
  // Add more sections as needed (e.g., profile)
  profile: { path: '/profile', steps: 1 }, // Example, adjust step count
};

// Helper to determine the initial section based on the path
const getSectionFromPath = (path) => {
  if (path === '/race') return 'practice';
  if (path === '/profile') return 'profile'; // Assuming profile has its own section start
  // Default to 'home' or 'further' based on logic (needs refinement based on full flow)
  // For now, default to 'home' if not '/race' or '/profile'
  return 'home'; 
};

const TutorialContext = createContext(null);

export const TutorialProvider = ({ children }) => {
  const location = useLocation();
  const [isRunning, setIsRunning] = useState(false);
  const [currentSection, setCurrentSection] = useState('home');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false); // Track if paused due to navigation/error
  const [errorState, setErrorState] = useState(null); // Store error info if needed

  // Function to determine the correct section based on path and current state
  const determineSection = useCallback((path) => {
    // Treat lobby routes as practice section
    if (typeof path === 'string' && path.startsWith('/lobby')) return 'practice';
    // Basic logic: if path matches a section's path, use that section.
    // More complex logic might be needed if multiple sections share a path (like home/further)
    for (const sectionName in TUTORIAL_SECTIONS) {
      if (TUTORIAL_SECTIONS[sectionName].path === path) {
        // Prioritize 'practice' if on /race
        if (path === '/race') return 'practice';
        // Prioritize 'profile' if on /profile
        if (path === '/profile') return 'profile';
        // Handle home/further ambiguity - needs clearer logic based on tutorial flow
        // For now, if already in 'further', stay there on /home, otherwise default to 'home'
        if (path === '/home') {
          return currentSection === 'further' ? 'further' : 'home';
        }
        return sectionName;
      }
    }
    // This function now needs the path passed to it
    // Basic logic: if path matches a section's path, use that section.
    // More complex logic might be needed if multiple sections share a path (like home/further)
    for (const sectionName in TUTORIAL_SECTIONS) {
      if (TUTORIAL_SECTIONS[sectionName].path === path) {
        // Prioritize 'practice' if on /race
        if (path === '/race') return 'practice';
        // Prioritize 'profile' if on /profile
        if (path === '/profile') return 'profile';
        // Handle home/further ambiguity - needs clearer logic based on tutorial flow
        // For now, if already in 'further', stay there on /home, otherwise default to 'home'
        if (path === '/home') {
          // If the current section is already 'further', stay there when navigating to /home.
          // Otherwise, default to 'home'. This assumes 'further' steps also happen on /home.
          return currentSection === 'further' ? 'further' : 'home';
        }
        return sectionName;
      }
    }
    return 'home'; // Default fallback
  }, [currentSection]); // Keep dependency on currentSection for home/further logic

  // Start the tutorial - Requires initial path to determine section
  const startTutorial = useCallback((initialPath, section = null, step = 0) => {
    const path = initialPath || location.pathname;
    const startSection = section || determineSection(path);

    console.log(`[TutorialContext] Starting tutorial. Initial path: ${path}, Determined section: ${startSection}, Step: ${step}`);

    setCurrentSection(startSection);
    setCurrentStepIndex(step);
    setIsRunning(true);
    setIsPaused(false);
    setErrorState(null);
  }, [determineSection, location.pathname]);

  // End the tutorial
  const endTutorial = useCallback(() => {
    console.log('[TutorialContext] Ending tutorial.');
    setIsRunning(false);
    setCurrentSection('home'); // Reset to default section
    setCurrentStepIndex(0);
    setIsPaused(false);
    setErrorState(null);
    
    // Call markTutorialComplete from the auth context if we have that function
    try {
      const { markTutorialAsCompleted } = window.user || {};
      if (typeof markTutorialAsCompleted === 'function') {
        console.log('[TutorialContext] Marking tutorial as completed via user API');
        markTutorialAsCompleted();
      }
    } catch (err) {
      console.error('[TutorialContext] Error marking tutorial as completed:', err);
    }
  }, []);

  // Advance to the next step
  const advanceStep = useCallback(() => {
    if (!isRunning || isPaused) return;
    setCurrentStepIndex(prev => prev + 1);
    console.log(`[TutorialContext] Advanced to step ${currentStepIndex + 1} in section ${currentSection}`);
  }, [isRunning, isPaused, currentStepIndex, currentSection]);

  // Go to a specific step/section
  const goToStep = useCallback((section, stepIndex) => {
    if (!isRunning) return; // Maybe allow starting if not running?
    console.log(`[TutorialContext] Going to step ${stepIndex} in section ${section}`);
    setCurrentSection(section);
    setCurrentStepIndex(stepIndex);
    setIsPaused(false); // Resume if paused
    setErrorState(null);
  }, [isRunning]);

  // Pause the tutorial (e.g., due to navigation mismatch or error)
  const pauseTutorial = useCallback((reason = 'unknown') => {
    if (!isRunning) return;
    console.log(`[TutorialContext] Pausing tutorial. Reason: ${reason}`);
    setIsPaused(true);
    setErrorState(reason); // Store the reason for pausing
  }, [isRunning]);

  // Resume the tutorial
  const resumeTutorial = useCallback(() => {
    if (!isRunning || !isPaused) return;
    console.log('[TutorialContext] Resuming tutorial.');
    setIsPaused(false);
    setErrorState(null);
  }, [isRunning, isPaused]);

  // Update section and step based on navigation
  const handleNavigation = useCallback((newPath) => {
    if (!isRunning) return;

    const expectedSection = determineSection(newPath);
    console.log(`[TutorialContext] Navigation detected. New path: ${newPath}, Expected section: ${expectedSection}`);

    if (expectedSection !== currentSection) {
      // Logic to determine the correct step index when changing sections
      let newStepIndex = 0; 
      // Example: If navigating from home to race, start practice section at step 0
      if (currentSection === 'home' && expectedSection === 'practice') {
        newStepIndex = 0;
      } 
      // Example: If navigating from race back to home, start further section at step 0
      else if (currentSection === 'practice' && expectedSection === 'further') {
        newStepIndex = 0; 
      }
      // Add more specific transition logic here based on your step definitions
      // ...

      console.log(`[TutorialContext] Section changed from ${currentSection} to ${expectedSection}. Setting step to ${newStepIndex}.`);
      setCurrentSection(expectedSection);
      setCurrentStepIndex(newStepIndex);
      setIsPaused(false); // Resume on successful section change
      setErrorState(null);
    } else {
      // Still in the same section, potentially resume if paused
      if (isPaused) {
         console.log(`[TutorialContext] Resuming tutorial in section ${currentSection} after navigation.`);
         resumeTutorial();
      }
    }
  }, [isRunning, currentSection, isPaused, determineSection, resumeTutorial]);

  // Memoize the context value
  const value = useMemo(() => ({
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
    determineSection, // Expose determineSection for use in TutorialGuide
    TUTORIAL_SECTIONS
  }), [
    isRunning, currentSection, currentStepIndex, isPaused, errorState,
    startTutorial, endTutorial, advanceStep, goToStep, pauseTutorial, resumeTutorial, determineSection // Removed handleNavigation, added determineSection
  ]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

export default TutorialContext;
