import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../../components/Navbar';

// Mock the AuthContext
vi.mock('../../context/AuthContext', () => {
  return {
    useAuth: () => {
      return {
        authenticated: false,
        user: null,
        logout: vi.fn()
      };
    }
  };
});

describe('Navbar Component', () => {
  it('renders with TigerType title', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    
    expect(screen.getByText('TigerType')).toBeInTheDocument();
  });
  
  it('renders within header element', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    
    const headerElement = screen.getByRole('banner');
    expect(headerElement).toBeInTheDocument();
    expect(headerElement).toHaveClass('navbar');
  });
  
  it('contains navigation element', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    
    const navElement = screen.getByRole('navigation');
    expect(navElement).toBeInTheDocument();
    expect(navElement).toHaveClass('navbar-links');
  });
}); 