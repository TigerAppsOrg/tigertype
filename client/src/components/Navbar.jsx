import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';
import { useRace } from '../context/RaceContext';

function Navbar() {
  const { authenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const { 
      raceState, 
      typingState,
      setPlayerReady, 
      resetRace 
    } = useRace();

  const handleLogo = () => {
    resetRace();
    navigate('/home');
  };

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <button type='text' onClick={handleLogo}>TigerType</button>
      </div>
      
      <nav className="navbar-links">
        {authenticated ? (
          <>
            <button onClick={logout} className="logout-button">Logout</button>
            <span className="user-info">{user?.netid || ''}</span>
          </>
        ) : (
          <>
            <a href="#">About</a>
            <a href="#">Features</a>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;