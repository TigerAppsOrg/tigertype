import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Loading from '../../components/Loading';

describe('Loading Component', () => {
  it('renders loading spinner and text', () => {
    render(<Loading />);
    
    const loadingElement = screen.getByText(/Loading TigerType/i);
    expect(loadingElement).toBeInTheDocument();
    
    const container = screen.getByTestId('loading-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('loading-container');
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('loading-spinner');
  });
}); 