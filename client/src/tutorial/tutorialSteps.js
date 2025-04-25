// tutorialSteps.js
// Define all tutorial steps per section with anchor IDs

export const tutorialSteps = {
  home: [
    { id: 'home-start', anchorId: 'body', content: "Welcome to TigerType, a Princeton-based typing game for all students! Click Next to start the tutorial; you can also close this and come back to the tutorial at anytime by pressing the '?' button in the top left." },
    { id: 'home-practice', anchorId: 'mode-practice', content: 'Solo practice is where you can practice typing by yourself; you can choose and filter between different modes and options we\'ll discuss later.' },
    { id: 'home-quick', anchorId: 'mode-quick', content: 'This is the Quick Match button. It will put you into the public matchmaking queue, where you are able to play against anyone else also in the queue. \nNOTE: A minimum of 2 players are required to start a game and a max of 10 players can be in a lobby.' },
    { id: 'home-create-private', anchorId: 'mode-create-private', content: 'You can also create private lobbies to race against just your friends. This allows you to select specific modes and options for your race (just like in solo practice).' },
    { id: 'home-join-private', anchorId: 'mode-join-private', content: 'You can join a private lobby by entering the lobby code or link that your friends can share with you or entering their NetID. You can also join private lobby by directly entering the URL.' },
    { id: 'home-activate-practice', anchorId: 'mode-practice', content: 'Click Solo Practice to continue the tutorial for practice mode, or click the \'X\' button to close the tutorial and come back later.', spotlightClicks: true, event: 'click', placement: 'top' }
  ],
  practice: [
    { id: 'practice-start', anchorId: 'body', content: 'Welcome to the Solo Mode Tutorial! You can skip and replay this tutorial at anytime.' },
    { id: 'practice-configurator', anchorId: 'configurator', content: 'This is the Test Configurator where you have access to all the modes and their options.' },
    { id: 'practice-mode-timed', anchorId: 'mode-timed', content: 'Let\'s check out TIMED mode.', spotlightClicks: true, event: 'click' },
    { id: 'practice-mode-timed-desc', anchorId: 'mode-timed', content: 'TIMED mode is similar to MonkeyType, where you are given a random selection of the 1,000 most common english words. You have a set amount of time to type as many words as possible.' },
    { id: 'practice-timed-options', anchorId: 'timed-options', content: 'You can select any duration; each one has its own leaderboard entry.' },
    { id: 'practice-mode-snippet', anchorId: 'mode-snippet', content: 'Let\'s switch back to Snippet Mode.', spotlightClicks: true },
    { id: 'practice-race-content', anchorId: 'race-content', content: 'Here is the text that you will type. As you type, you will see your stats and progress update in real time.' },
    { id: 'practice-typing-start', anchorId: 'typing-input', content: 'Practice mode will automatically begin when you start typing the first letter of any text.' },
    { id: 'practice-typing-action', anchorId: 'typing-input', content: 'Start typing now; feel free to make a mistake to see the mistake highlighting in action.' },
    { id: 'practice-results-screen', anchorId: 'practice-results', content: 'Great job! This is your Practice Results screen with your stats.' },
    { id: 'practice-stats', anchorId: 'practice-results', content: 'Here are your Time, Accuracy, Raw WPM, and Adjusted WPM for this snippet.' },
    { id: 'practice-shortcuts', anchorId: 'keyboard-shortcuts', content: 'Press Tab for a new excerpt and Esc to restart.' },
    { id: 'practice-finish', anchorId: 'body', content: 'You have finished the Practice Mode tutorial! Feel free to check out the leaderboards and close this by pressing the X.' }
  ],
  further: [
    { id: 'further-end', anchorId: 'body', content: 'That concludes the tutorial. Happy typing!' }
  ]
};