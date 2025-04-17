const { commonWords } = require('../../client/src/lib/commonWords.cjs');

/**
 * Timed test generator utility
 * 
 * Creates random word sequences for timed typing tests using common English words
 */

/**
 * Generates a random text for timed typing tests
 * 
 * @param {number} wordCount - Number of words to generate
 * @param {Object} options - Generation options
 * @param {boolean} options.capitalize - Whether to capitalize the first letter of each sentence
 * @param {boolean} options.punctuation - Whether to add punctuation
 * @returns {string} Generated text
 */
function generateTimedText(wordCount = 100, options = {}) {
  const { capitalize = true, punctuation = true } = options;
  
  // Default: select words randomly from the common words list
  let selectedWords = [];
  
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * commonWords.length);
    selectedWords.push(commonWords[randomIndex]);
  }
  
  // Add punctuation and capitalization if requested
  if (punctuation || capitalize) {
    // Randomly determine sentence lengths (5-15 words)
    const sentenceWords = [];
    let currentSentence = [];
    
    for (let i = 0; i < selectedWords.length; i++) {
      currentSentence.push(selectedWords[i]);
      
      // Decide if we should end the sentence (random length between 5-15 words)
      const randomSentenceLength = Math.floor(Math.random() * 11) + 5; // 5-15 words
      
      if (currentSentence.length >= randomSentenceLength && i < selectedWords.length - 1) {
        sentenceWords.push([...currentSentence]);
        currentSentence = [];
      }
    }
    
    // Add any remaining words as the last sentence
    if (currentSentence.length > 0) {
      sentenceWords.push(currentSentence);
    }
    
    // Format sentences with capitalization and punctuation
    let formattedText = '';
    
    sentenceWords.forEach((sentence, index) => {
      let sentenceText = sentence.join(' ');
      
      // Capitalize first letter if requested
      if (capitalize) {
        sentenceText = sentenceText.charAt(0).toUpperCase() + sentenceText.slice(1);
      }
      
      // Add period at the end if punctuation is requested
      if (punctuation) {
        sentenceText += '.';
      }
      
      formattedText += sentenceText;
      
      // Add space between sentences, but not after the last one
      if (index < sentenceWords.length - 1) {
        formattedText += ' ';
      }
    });
    
    return formattedText;
  }
  
  // If no formatting, just join the words with spaces
  return selectedWords.join(' ');
}

/**
 * Creates a snippet object with the same structure as database snippets
 * but generated programmatically for timed tests
 *
 * @param {number} duration - Test duration in seconds (used to determine word count)
 * @returns {Object} Snippet object with the same structure as database snippets
 */
function createTimedTestSnippet(duration = 15) {
  // For the initial words, we'll generate enough for about 20 seconds of typing
  // This ensures users will need to request more words frequently
  const initialWordCount = 100;
  
  // Generate the text content - NO capitalization or punctuation for timed tests
  const text = generateTimedText(initialWordCount, { 
    capitalize: false, 
    punctuation: false 
  });
  
  // Create a snippet object similar to what the database would return
  return {
    id: `timed-${duration}`, // Use a special ID format to identify timed tests
    text: text,
    source: 'Timed Test',
    category: 'timed',
    difficulty: 1,
    is_timed_test: true,
    duration: duration
  };
}

module.exports = {
  generateTimedText,
  createTimedTestSnippet
}; 