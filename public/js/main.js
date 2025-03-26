/**
 * TigerType Frontend Main.js
 * Handles user interactions and connections to the backend
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication status first
  checkAuthentication();
  
  // Initialize cursor manager
  const cursorManager = new CursorManager();
  
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

  // Function to check if user is authenticated, redirect to login if not
  function checkAuthentication() {
    fetch('/auth/status')
      .then(response => response.json())
      .then(data => {
        if (!data.authenticated || !data.user) {
          console.log('User not authenticated, redirecting to login...');
          // Redirect to login explicitly
          window.location.href = '/auth/login';
        } else {
          console.log('User authenticated:', data.user);
        }
      })
      .catch(error => {
        console.error('Error checking authentication status:', error);
      });
  }

  // Socket connection - only establish after we know authentication is okay
  console.log('Initializing socket connection...');
  
  // Configure socket.io with reconnection options
  const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });
  
  // Add socket connection event handlers
  socket.on('connect', () => {
    console.log('Socket connected successfully with ID:', socket.id);
    
    // Ensure UI is updated when reconnecting
    if (raceState.code) {
      console.log('Reconnected during active race, requesting state update...');
      // Consider adding a rejoin mechanism here if needed
    }
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    
    // Check if it's an authentication error
    if (error && (error.message || '').includes('Authentication')) {
      console.log('Authentication required. Redirecting to login...');
      window.location.href = '/auth/login';
    } else {
      console.error('Socket connection error:', error);
      
      // Only show alert for non-authentication errors
      if (!error.message.includes('Authentication')) {
        alert('Connection error. Please refresh the page to try again.');
      }
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect' || reason === 'io client disconnect') {
      // The server has disconnected us, we need to reconnect manually
      console.log('Server disconnected the socket, attempting to reconnect...');
      socket.connect();
    } else if (reason === 'transport close' || reason === 'transport error') {
      // Connection lost, will automatically try to reconnect
      console.log('Connection lost, auto-reconnecting...');
    } else if (reason === 'ping timeout') {
      console.log('Ping timeout, the connection was lost.');
      // Could add additional handling here
    } else if (reason.includes('Authentication')) {
      // Authentication issue
      console.error('Authentication required. Redirecting to login...');
      // Redirect to login page
      window.location.href = '/auth/login';
    }
  });
  
  socket.on('connect_failed', (error) => {
    console.error('Socket connection failed:', error);
    // If it's an authentication error, redirect to login
    if (error && (error.message || '').includes('Authentication')) {
      console.log('Authentication required. Redirecting to login...');
      window.location.href = '/auth/login';
    }
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    if (error && (error.message || '').includes('Authentication')) {
      console.log('Authentication required. Redirecting to login...');
      window.location.href = '/auth/login';
    }
  });

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
    console.log('Practice button clicked, joining practice mode...');
    socket.emit('practice:join');
  });

  publicBtn.addEventListener('click', () => {
    console.log('Public button clicked, joining public lobby...');
    socket.emit('public:join');
  });

  backBtn.addEventListener('click', () => {
    resetRaceState();
    showModeSelection();
  });

  // Typing input event handler
  typingInputEl.addEventListener('input', handleTypingInput);
  
  // Prevent paste to avoid cheating
  typingInputEl.addEventListener('paste', function(e) {
    if (raceState.type === 'practice' || raceState.inProgress) {
      e.preventDefault();
      return false;
    }
  });
  
  // Handle keyboard events for practice mode (prevent backspace on correct characters)
  typingInputEl.addEventListener('keydown', function(e) {
    // Only apply this in practice mode
    if (raceState.type !== 'practice') return;
    
    const input = typingInputEl.value;
    const snippet = raceState.snippet.text;
    
    // Prevent Cmd+A, Cmd+Backspace, Ctrl+A combinations
    if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A' || e.key === 'Backspace')) {
      e.preventDefault();
      return false;
    }
    
    // Check if the key is backspace and there's text to delete
    if (e.key === 'Backspace' && input.length > 0) {
      // Find the last correctly typed character's position
      let lastCorrectPos = 0;
      for (let i = 0; i < input.length; i++) {
        if (i >= snippet.length || input[i] !== snippet[i]) {
          break;
        }
        lastCorrectPos = i + 1;
      }
      
      // If attempting to delete a correct character, prevent it
      if (input.length === lastCorrectPos && !e.ctrlKey) {
        e.preventDefault();
        return false;
      }
      
      // If using Ctrl+Backspace, jump to the last error position
      if (e.ctrlKey && e.key === 'Backspace') {
        e.preventDefault();
        typingInputEl.value = input.substring(0, lastCorrectPos);
        // Trigger the input event programmatically
        typingInputEl.dispatchEvent(new Event('input'));
        return false;
      }
    }
  });

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
    countdownEl.textContent = count;
    
    const interval = setInterval(() => {
      count--;
      
      if (count <= 0) {
        clearInterval(interval);
        countdownEl.classList.add('hidden');
        return;
      }
      
      countdownEl.textContent = count;
    }, 1000);
  }

  // Start race
  function startRace() {
    console.log("Starting race...");
    typingInputContainer.classList.remove('hidden');
    typingInputEl.value = '';
    typingInputEl.focus();
    typingInputEl.disabled = false; // Ensure input is enabled when race starts
    
    // Initialize the snippet with spans for each character
    updateSnippetHighlighting('');
    
    // Enable cursor manager
    if (cursorManager) {
      cursorManager.enable();
      cursorManager.updateCursor(0, false);
      cursorManager.startBlink();
    }
  }

  // Handle typing input
  function handleTypingInput(e) {
    const input = e.target.value;
    const snippet = raceState.snippet.text;
    
    // In practice mode, ensure we don't remove correctly typed characters
    if (raceState.type === 'practice' && input.length > 0) {
      const perfectInput = snippet.substring(0, input.length);
      let correctPrefix = '';
      
      // Find the longest correct prefix
      for (let i = 0; i < input.length; i++) {
        if (input[i] === snippet[i]) {
          correctPrefix += input[i];
        } else {
          break;
        }
      }
      
      // If the user somehow deleted correct characters, restore them
      if (correctPrefix.length < input.length && correctPrefix !== input.substring(0, correctPrefix.length)) {
        const newInput = correctPrefix + input.substring(correctPrefix.length);
        e.target.value = newInput;
      }
    }
    
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
      raceState.completedTime = endTime; // Store completion time for fallback
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
    
    console.log("Showing results for type:", raceState.type, "Results:", results);
    
    if (raceState.type === 'practice') {
      // For practice mode, show detailed statistics for the current user
      const myResult = results.find(r => r.netid === netidEl.textContent);
      
      if (myResult) {
        console.log("Found my result:", myResult);
        
        // Calculate raw WPM vs adjusted WPM
        const snippet = raceState.snippet.text;
        const rawWpm = myResult.wpm; // WPM without accounting for errors
        const adjustedWpm = rawWpm * (myResult.accuracy / 100); // Adjusted for accuracy
        
        const statsHtml = `
          <div class="practice-results">
            <h3>Practice Results</h3>
            <div class="stat-item">
              <div class="stat-label">Time Completed:</div>
              <div class="stat-value">${myResult.completion_time.toFixed(2)}s</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Accuracy:</div>
              <div class="stat-value">${myResult.accuracy.toFixed(2)}%</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Raw WPM:</div>
              <div class="stat-value">${rawWpm.toFixed(2)}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Adjusted WPM:</div>
              <div class="stat-value">${adjustedWpm.toFixed(2)}</div>
            </div>
          </div>
        `;
        
        resultsListEl.innerHTML = statsHtml;
      } else {
        // Fallback if result not found - create a simple result display based on raceState data
        console.warn("Result not found for current user, using calculated fallback");
        
        const now = Date.now();
        const durationInSeconds = ((raceState.completedTime || now) - raceState.startTime) / 1000;
        const input = typingInputEl.value;
        const snippet = raceState.snippet.text;
        
        // Calculate stats directly
        const wpm = calculateWPM(input.length, durationInSeconds);
        const accuracy = calculateAccuracy(input, snippet);
        const adjustedWpm = wpm * (accuracy / 100);
        
        const statsHtml = `
          <div class="practice-results">
            <h3>Practice Results</h3>
            <div class="stat-item">
              <div class="stat-label">Time Completed:</div>
              <div class="stat-value">${durationInSeconds.toFixed(2)}s</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Accuracy:</div>
              <div class="stat-value">${accuracy.toFixed(2)}%</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Raw WPM:</div>
              <div class="stat-value">${wpm.toFixed(2)}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Adjusted WPM:</div>
              <div class="stat-value">${adjustedWpm.toFixed(2)}</div>
            </div>
          </div>
        `;
        
        resultsListEl.innerHTML = statsHtml;
      }
    } else {
      // For multiplayer races, show all results in order
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
  }

  // Update snippet highlighting based on user input
  function updateSnippetHighlighting(input) {
    const snippet = raceState.snippet.text;
    let html = '';
    
    // Check if there's any input content
    if (!snippet) {
      console.error('Snippet is not available yet');
      return;
    }
    
    // Generate highlighted HTML for the snippet
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
        html += `<span>${snippet[i]}</span>`;
      }
    }
    
    // Update snippet display with highlighted text
    snippetDisplayEl.innerHTML = html;
    
    // Update cursor position
    if (cursorManager) {
      const isError = input.length > 0 && input[input.length - 1] !== snippet[input.length - 1];
      cursorManager.updateCursor(input.length, isError);
    }
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
    
    // Reset cursor manager
    if (cursorManager) {
      cursorManager.stopBlink();
      cursorManager.disable();
    }
    
    // Reset snippet display
    snippetDisplayEl.textContent = '';
  }
});