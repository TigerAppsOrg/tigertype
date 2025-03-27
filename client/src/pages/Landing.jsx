import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Landing.css';
import tigerLogo from '../assets/tiger-icon_bg.png';

function Landing() {
  const { login } = useAuth();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-header">
          <img src={tigerLogo} alt="TigerType Logo" className="landing-logo" />
          <h1>TigerType</h1>
        </div>
        
        <div className="landing-description">
          <p>Improve your typing skills with Princeton-themed challenges!</p>
          <p>Race against fellow Princeton students or practice solo.</p>
        </div>
        
        <button onClick={login} className="login-button">
          Log In with Princeton CAS
        </button>
      </div>
      
      <div className="landing-footer">
        <div className="example-snippet">
          <p className="snippet-title">Example Text:</p>
          <p className="snippet-text">Princeton University, founded in 1746, is a private Ivy League research university in Princeton, New Jersey.</p>
        </div>
      </div>
    </div>
  );
}

export default Landing;