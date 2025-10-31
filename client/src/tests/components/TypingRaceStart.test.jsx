import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Typing from '../../components/Typing';

vi.mock('../../components/Sound.jsx', () => ({
  __esModule: true,
  default: vi.fn()
}));

vi.mock('../../components/TutorialAnchor.jsx', () => ({
  __esModule: true,
  default: ({ children }) => children
}));

vi.mock('../../context/SocketContext', () => ({
  __esModule: true,
  useSocket: () => ({
    socket: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    }
  })
}));

vi.mock('../../context/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({ user: { netid: 'tester' } })
}));

vi.mock('../../context/RaceContext', () => {
  const React = require('react');
  const { useState, useCallback } = React;

  const createInitialRaceState = () => ({
    code: null,
    type: 'practice',
    lobbyId: null,
    hostNetId: null,
    snippet: { id: 'test-snippet', text: 'sample text', is_timed_test: false },
    players: [],
    startTime: null,
    inProgress: false,
    completed: false,
    results: [],
    manuallyStarted: false,
    timedTest: { enabled: false, duration: 15 },
    snippetFilters: { difficulty: 'all', type: 'all', department: 'all' },
    settings: { testMode: 'snippet', testDuration: 15 },
    countdown: null
  });

  const createInitialTypingState = () => ({
    input: '',
    position: 0,
    correctChars: 0,
    errors: 0,
    completed: false,
    wpm: 0,
    accuracy: 0,
    lockedPosition: 0
  });

  const noop = () => {};

  return {
    __esModule: true,
    useRace: () => {
      const [raceState, setRaceState] = useState(createInitialRaceState);
      const [typingState, setTypingState] = useState(createInitialTypingState);

      const handleInput = useCallback((incomingInput) => {
        setTypingState(prev => ({
          ...prev,
          input: incomingInput,
          position: incomingInput.length
        }));
        return incomingInput;
      }, []);

      return {
        raceState,
        setRaceState,
        typingState,
        setTypingState,
        updateProgress: noop,
        handleInput,
        loadNewSnippet: noop
      };
    }
  };
});

describe('Typing initial input handling', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('retains simultaneous characters once the practice start is initialized', async () => {
    render(<Typing />);
    const input = screen.getByRole('textbox');

    await act(async () => {
      fireEvent.change(input, { target: { value: 's' } });
      fireEvent.change(input, { target: { value: 'sa' } });
      fireEvent.change(input, { target: { value: 'sam' } });
    });

    await waitFor(() => {
      expect(input.value).toBe('sam');
    });
  });
});
