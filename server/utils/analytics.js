/**
 * Analytics utility for calculating typing metrics
 */

// Calculate words per minute (WPM)
// Standard: 5 characters = 1 word (including spaces)
const calculateWPM = (typedCharacters, durationInSeconds) => {
  // Avoid division by zero
  if (durationInSeconds === 0) return 0;
  
  // Words are standardized as 5 characters
  const words = typedCharacters / 5;
  
  // Convert seconds to minutes and calculate WPM
  const minutes = durationInSeconds / 60;
  return Math.round((words / minutes) * 100) / 100;
};

// Calculate typing accuracy as a percentage
const calculateAccuracy = (correctChars, totalChars) => {
  // Avoid division by zero
  if (totalChars === 0) return 100;
  
  // Calculate percentage and round to 2 decimal places
  return Math.round((correctChars / totalChars) * 10000) / 100;
};

// Validate if the current typing position is correct
const validateProgress = (snippet, userInput, position) => {
  // Check if position is within bounds
  if (position < 0 || position > snippet.length) {
    return false;
  }
  
  // Check if the typed content matches the snippet up to this position
  return userInput === snippet.substring(0, position);
};

// Calculate typing statistics
const getTypingStats = (snippet, userInput, durationInSeconds) => {
  let correctChars = 0;
  let totalChars = Math.min(userInput.length, snippet.length);
  
  // Count correct characters
  for (let i = 0; i < totalChars; i++) {
    if (userInput[i] === snippet[i]) {
      correctChars++;
    }
  }
  
  // Calculate metrics
  const wpm = calculateWPM(userInput.length, durationInSeconds);
  const accuracy = calculateAccuracy(correctChars, totalChars);
  
  return {
    wpm,
    accuracy,
    correctChars,
    totalChars,
    completionPercentage: Math.round((userInput.length / snippet.length) * 100)
  };
};

module.exports = {
  calculateWPM,
  calculateAccuracy,
  validateProgress,
  getTypingStats
};