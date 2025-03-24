/**
 * TigerType Frontend Main.js
 * Handles user interactions and connections to the backend
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const practiceBtn = document.getElementById('practice-btn');
  const publicBtn = document.getElementById('public-btn');
  const modeSelection = document.querySelector('.mode-selection');
  const raceContainer = document.getElementById('race-container');
  const lobbyCodeEl = document.getElementById('lobby-code');
  const playersListEl = document.getElementById('players-list');
  const countdownEl = document.getElementById('countdown');
  const snippetDisplayEl = document.getElementById('snippet-display');
  const typingInputContainer = document.getElementById('typing-input-container');
  const typingInputEl = document.getElementById('typing-input');
  const progressDisplayEl = document.getElementById('progress-display');
  const resultsContainerEl = document.getElementById('results-container');
  const resultsListEl = document.getElementById('results-list');
  const backBtn = document.getElementById('back-btn');
  const netidEl = document.getElementById('netid');

  // Socket connection
  const socket = io();

  // Game state
  let raceState = {
    code: null,
    type: null,
    snippet: null,
    players: [],
    startTime: null,
    inProgress: false,
    completed: false,
    results: []
  };

  // Display user's netID once connected
  socket.on('connected', (data) => {
    console.log('Connected to server:', data);
    netidEl.textContent = data.netid;
  });

  // Socket event listeners
  socket.on('race:joined', (data) => {
    console.log('Joined race:', data);
    
    // Update race state
    raceState.code = data.code;
    raceState.type = data.type;
    raceState.snippet = data.snippet;
    raceState.players = data.players || [];
    
    // Update UI
    showRaceScreen();
    updateLobbyInfo();
    
    // For practice mode, player is always ready
    if (data.type === 'practice') {
      // The server will automatically start the countdown
    } else {
      // Mark player as not ready (will need to click ready)
      const readyBtn = document.createElement('button');
      readyBtn.textContent = 'Ready';
      readyBtn.className = 'ready-btn';
      readyBtn.addEventListener('click', () => {
        socket.emit('player:ready');
        readyBtn.disabled = true;
        readyBtn.textContent = 'Waiting for others...';
      });
      
      // Add ready button to UI
      document.getElementById('race-info').appendChild(readyBtn);
    }
  });

  socket.on('race:playersUpdate', (data) => {
    raceState.players = data.players;
    updatePlayersInfo();
  });

  socket.on('race:countdown', (data) => {
    startCountdown(data.seconds);
  });

  socket.on('race:start', (data) => {
    raceState.startTime = data.startTime;
    raceState.inProgress = true;
    startRace();
  });

  socket.on('race:playerProgress', (data) => {
    updatePlayerProgress(data);
  });

  socket.on('race:playerResult', (data) => {
    addPlayerResult(data);
  });

  socket.on('race:end', (data) => {
    raceState.inProgress = false;
    raceState.completed = true;
    showResults(data.results);
  });

  socket.on('race:playerLeft', (data) => {
    // Update the players list and progress display
    const playerIndex = raceState.players.findIndex(p => p.netid === data.netid);
    
    if (playerIndex !== -1) {
      raceState.players.splice(playerIndex, 1);
      updatePlayersInfo();
      
      // Remove player progress bar
      const progressBar = document.getElementById(`progress-${data.netid}`);
      if (progressBar) {
        progressBar.remove();
      }
    }
  });

  socket.on('error', (data) => {
    alert(`Error: ${data.message}`);
  });

  // Event listeners for buttons
  practiceBtn.addEventListener('click', () => {
    socket.emit('practice:join');
  });

  publicBtn.addEventListener('click', () => {
    socket.emit('public:join');
  });

  backBtn.addEventListener('click', () => {
    resetRaceState();
    showModeSelection();
  });

  // Typing input event handler
  typingInputEl.addEventListener('input', handleTypingInput);

  // Function to show race screen
  function showRaceScreen() {
    modeSelection.classList.add('hidden');
    raceContainer.classList.remove('hidden');
    resultsContainerEl.classList.add('hidden');
  }

  // Function to show mode selection screen
  function showModeSelection() {
    modeSelection.classList.remove('hidden');
    raceContainer.classList.add('hidden');
    resultsContainerEl.classList.add('hidden');
  }

  // Update lobby information
  function updateLobbyInfo() {
    lobbyCodeEl.textContent = `Lobby Code: ${raceState.code}`;
    snippetDisplayEl.textContent = raceState.snippet.text;
    updatePlayersInfo();
  }

  // Update players list
  function updatePlayersInfo() {
    playersListEl.innerHTML = '';
    
    raceState.players.forEach(player => {
      const playerEl = document.createElement('div');
      playerEl.className = `player-item ${player.ready ? 'player-ready' : ''}`;
      playerEl.textContent = `${player.netid} ${player.ready ? '(Ready)' : ''}`;
      playersListEl.appendChild(playerEl);
    });
    
    // Initialize progress bars
    initializeProgressBars();
  }

  // Initialize progress bars for all players
  function initializeProgressBars() {
    progressDisplayEl.innerHTML = '';
    
    raceState.players.forEach(player => {
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.id = `progress-${player.netid}`;
      
      const progressFill = document.createElement('div');
      progressFill.className = 'progress-fill';
      progressFill.style.width = '0%';
      
      const progressLabel = document.createElement('div');
      progressLabel.className = 'progress-label';
      progressLabel.textContent = `${player.netid}: 0%`;
      
      progressBar.appendChild(progressFill);
      progressBar.appendChild(progressLabel);
      progressDisplayEl.appendChild(progressBar);
    });
  }

  // Start countdown
  function startCountdown(seconds) {
    countdownEl.classList.remove('hidden');
    
    let count = seconds;
    
    const interval = setInterval(() => {
      countdownEl.textContent = count;
      
      if (count <= 0) {
        clearInterval(interval);
        countdownEl.classList.add('hidden');
      }
      
      count--;
    }, 1000);
  }

  // Start race
  function startRace() {
    typingInputContainer.classList.remove('hidden');
    typingInputEl.value = '';
    typingInputEl.focus();
  }

  // Handle typing input
  function handleTypingInput(e) {
    const input = e.target.value;
    const snippet = raceState.snippet.text;
    
    // Calculate progress
    const position = input.length;
    const isCompleted = position === snippet.length && input === snippet;
    
    // Send progress to server
    socket.emit('race:progress', {
      code: raceState.code,
      position,
      completed: isCompleted
    });
    
    // Highlight the current character position in the snippet
    updateSnippetHighlighting(input);
    
    // If completed, calculate and send results
    if (isCompleted) {
      const endTime = Date.now();
      const durationInSeconds = (endTime - raceState.startTime) / 1000;
      
      // Calculate WPM and accuracy
      const wpm = calculateWPM(input.length, durationInSeconds);
      const accuracy = calculateAccuracy(input, snippet);
      
      // Send result to server
      socket.emit('race:result', {
        code: raceState.code,
        wpm,
        accuracy
      });
      
      // Disable input
      typingInputEl.disabled = true;
    }
  }

  // Update player progress
  function updatePlayerProgress(data) {
    const progressBar = document.getElementById(`progress-${data.netid}`);
    
    if (progressBar) {
      const progressFill = progressBar.querySelector('.progress-fill');
      const progressLabel = progressBar.querySelector('.progress-label');
      
      progressFill.style.width = `${data.percentage}%`;
      progressLabel.textContent = `${data.netid}: ${data.percentage}%`;
      
      if (data.completed) {
        progressBar.classList.add('completed');
      }
    }
  }

  // Add player result to results list
  function addPlayerResult(data) {
    // Check if player already in results
    const existingIndex = raceState.results.findIndex(r => r.netid === data.netid);
    
    if (existingIndex !== -1) {
      raceState.results[existingIndex] = data;
    } else {
      raceState.results.push(data);
    }
    
    // Sort results by WPM
    raceState.results.sort((a, b) => b.wpm - a.wpm);
  }

  // Show race results
  function showResults(results) {
    resultsContainerEl.classList.remove('hidden');
    resultsListEl.innerHTML = '';
    
    results.forEach((result, index) => {
      const resultEl = document.createElement('div');
      resultEl.className = 'result-item';
      
      resultEl.innerHTML = `
        <div class="result-rank">#${index + 1}</div>
        <div class="result-netid">${result.netid}</div>
        <div class="result-wpm">${result.wpm.toFixed(2)} WPM</div>
        <div class="result-accuracy">${result.accuracy.toFixed(2)}%</div>
        <div class="result-time">${result.completion_time.toFixed(2)}s</div>
      `;
      
      resultsListEl.appendChild(resultEl);
    });
  }

  // Update snippet highlighting based on user input
  function updateSnippetHighlighting(input) {
    const snippet = raceState.snippet.text;
    let html = '';
    
    for (let i = 0; i < snippet.length; i++) {
      if (i < input.length) {
        if (input[i] === snippet[i]) {
          html += `<span class="correct">${snippet[i]}</span>`;
        } else {
          html += `<span class="incorrect">${snippet[i]}</span>`;
        }
      } else if (i === input.length) {
        html += `<span class="current">${snippet[i]}</span>`;
      } else {
        html += snippet[i];
      }
    }
    
    snippetDisplayEl.innerHTML = html;
  }

  // Calculate words per minute
  function calculateWPM(charsTyped, durationInSeconds) {
    // Standard: 5 chars = 1 word
    const wordsTyped = charsTyped / 5;
    const minutes = durationInSeconds / 60;
    
    return wordsTyped / minutes;
  }

  // Calculate typing accuracy
  function calculateAccuracy(input, snippet) {
    let correctChars = 0;
    const minLength = Math.min(input.length, snippet.length);
    
    for (let i = 0; i < minLength; i++) {
      if (input[i] === snippet[i]) {
        correctChars++;
      }
    }
    
    return (correctChars / snippet.length) * 100;
  }

  // Reset race state
  function resetRaceState() {
    raceState = {
      code: null,
      type: null,
      snippet: null,
      players: [],
      startTime: null,
      inProgress: false,
      completed: false,
      results: []
    };
    
    typingInputEl.value = '';
    typingInputEl.disabled = false;
    typingInputContainer.classList.add('hidden');
    countdownEl.classList.add('hidden');
    progressDisplayEl.innerHTML = '';
  }
});