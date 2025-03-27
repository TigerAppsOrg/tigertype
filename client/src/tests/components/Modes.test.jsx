import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modes from '../../components/Modes';

// Mock modes data
const mockModes = [
  {
    id: 1,
    name: 'Practice Mode',
    description: 'Practice your typing skills',
    action: vi.fn(),
    disabled: false
  },
  {
    id: 2,
    name: 'Race Mode',
    description: 'Compete with others',
    action: vi.fn(),
    disabled: false
  },
  {
    id: 3,
    name: 'Tournament Mode',
    description: 'Join organized tournaments',
    action: vi.fn(),
    disabled: true
  }
];

describe('Modes Component', () => {
  it('renders all mode boxes', () => {
    render(<Modes modes={mockModes} />);
    
    // Check all modes are rendered
    expect(screen.getByText('Practice Mode')).toBeInTheDocument();
    expect(screen.getByText('Race Mode')).toBeInTheDocument();
    expect(screen.getByText('Tournament Mode')).toBeInTheDocument();
    
    // Check descriptions
    expect(screen.getByText('Practice your typing skills')).toBeInTheDocument();
    expect(screen.getByText('Compete with others')).toBeInTheDocument();
    expect(screen.getByText('Join organized tournaments')).toBeInTheDocument();
  });
  
  it('shows "Coming Soon" badge for disabled modes', () => {
    render(<Modes modes={mockModes} />);
    
    // Only disabled modes should have the "Coming Soon" badge
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    
    // Find all mode boxes
    const modeBoxes = screen.getAllByRole('heading');
    expect(modeBoxes).toHaveLength(3);
  });
  
  it('calls action function when enabled mode is clicked', async () => {
    const user = userEvent.setup();
    render(<Modes modes={mockModes} />);
    
    // Click on Practice Mode (enabled)
    const practiceMode = screen.getByText('Practice Mode').closest('.mode-box');
    await user.click(practiceMode);
    
    // Action should be called
    expect(mockModes[0].action).toHaveBeenCalled();
  });
  
  it('does not call action function when disabled mode is clicked', async () => {
    const user = userEvent.setup();
    render(<Modes modes={mockModes} />);
    
    // Click on Tournament Mode (disabled)
    const tournamentMode = screen.getByText('Tournament Mode').closest('.mode-box');
    await user.click(tournamentMode);
    
    // Action should not be called
    expect(mockModes[2].action).not.toHaveBeenCalled();
  });
}); 