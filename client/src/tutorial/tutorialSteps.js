// tutorialSteps.js
// Define all tutorial steps per section with anchor IDs

export const tutorialSteps = {
  home: [
    { id: 'home-start', anchorId: 'body', content: 'Welcome to TigerType! Click Next to start the tutorial.' },
    { id: 'home-practice', anchorId: 'mode-practice', content: 'This is the Practice Mode button.' },
    { id: 'home-quick', anchorId: 'mode-quick', content: 'This is the Quick Match button.' },
    { id: 'home-create-private', anchorId: 'mode-create-private', content: 'Click here to create a Private Lobby.' },
    { id: 'home-join-private', anchorId: 'mode-join-private', content: 'Click here to join a Private Lobby.' },
    { id: 'home-activate-practice', anchorId: 'mode-practice', content: 'Start Practice Mode by clicking here.', spotlightClicks: true, event: 'click', placement:'top' }
  ],
  practice: [
    { id: 'practice-start', anchorId: 'body', content: 'Welcome to Practice Mode! Click Next to continue.' },
    { id: 'practice-configurator', anchorId: 'configurator', content: 'This is the Test Configurator where you choose modes and options.' },
    { id: 'practice-mode-timed', anchorId: 'mode-timed', content: 'Switch to Timed Mode here.', spotlightClicks: true },
    { id: 'practice-timed-options', anchorId: 'timed-options', content: 'Select the duration for Timed Mode.' },
    { id: 'practice-mode-snippet', anchorId: 'mode-snippet', content: 'Switch back to Snippet Mode here.', spotlightClicks: true },
    { id: 'practice-race-content', anchorId: 'race-content', content: 'This area shows the text you need to type.' },
    { id: 'practice-typing-input', anchorId: 'typing-input', content: 'Focus here and begin typing your practice.' },
    { id: 'practice-back', anchorId: 'back-button', content: 'Click this Back button to return to the home screen.', spotlightClicks: true }
  ],
  further: [
    { id: 'further-end', anchorId: 'body', content: 'That concludes the tutorial. Happy typing!' }
  ]
}; 