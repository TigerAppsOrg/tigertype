import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileWidget from './ProfileWidget'; 
import './Navbar.css';

function Navbar() {
  const { authenticated, user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <Link to={authenticated ? '/home' : '/'}>TigerType</Link>
      </div>
      
      <nav className="navbar-links">
        {authenticated ? (
          <>
            <button onClick={logout} className="logout-button">Logout</button>
            <ProfileWidget user={user}/>
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