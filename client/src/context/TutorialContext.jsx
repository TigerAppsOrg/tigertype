import React, { createContext, useContext, useState, useCallback } from 'react';

// TutorialContext provides global state for tutorial running and replay
const TutorialContext = createContext(null);

export const TutorialProvider = ({ children }) => {
  const [isTutorialRunning, setIsTutorialRunning] = useState(false);

  // Start the tutorial (e.g., from Navbar or auto-trigger)
  const startTutorial = useCallback(() => setIsTutorialRunning(true), []);

  // End the tutorial (called by TutorialGuide on finish/skip)
  const endTutorial = useCallback(() => setIsTutorialRunning(false), []);

  return (
    <TutorialContext.Provider value={{
      isTutorialRunning,
      startTutorial,
      endTutorial
    }}>
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
