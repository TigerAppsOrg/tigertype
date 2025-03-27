import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Typing from '../../components/Typing';
import { MockRaceProvider } from '../mocks/mockContexts';

// Override the useRace import in the Typing component
vi.mock('../../context/RaceContext', () => {
  return {
    useRace: () => {
      return {
        raceState: {
          inProgress: true,
          type: 'practice',
          snippet: {
            text: 'This is a test snippet for typing practice.',
            title: 'Test Snippet'
          },
          players: [
            { netid: 'player1', progress: 30 },
            { netid: 'player2', progress: 20 }
          ],
          startTime: Date.now()
        },
        typingState: {
          position: 0,
          correctChars: 0,
          completed: false
        },
        updateProgress: vi.fn()
      };
    }
  };
});

describe('Typing Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the typing component correctly', () => {
    const { container } = render(<Typing />);
    
    // Check that the snippet display and other key elements are present
    expect(container.querySelector('.snippet-display')).toBeInTheDocument();
    expect(container.querySelector('.typing-input-container')).toBeInTheDocument();
    expect(container.querySelector('.progress-container')).toBeInTheDocument();
    expect(container.querySelector('.stats')).toBeInTheDocument();
  });
  
  it('has input field for typing', () => {
    render(<Typing />);
    
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toBeInTheDocument();
  });
  
  it('shows player progress', () => {
    render(<Typing />);
    
    expect(screen.getByText('player1: 30%')).toBeInTheDocument();
    expect(screen.getByText('player2: 20%')).toBeInTheDocument();
  });
  
  it('shows WPM stat when race is in progress', () => {
    render(<Typing />);
    
    expect(screen.getByText('WPM:')).toBeInTheDocument();
  });

  it('shows accuracy stat when race is in progress', () => {
    render(<Typing />);
    
    expect(screen.getByText('Accuracy:')).toBeInTheDocument();
  });
}); 