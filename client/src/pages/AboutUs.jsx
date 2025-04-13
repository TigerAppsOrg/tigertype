import React, { useState } from 'react';
import './AboutUs.css'; // We'll create this next

const CollapsibleSection = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="collapsible-section">
      <button onClick={toggleOpen} className="collapsible-header">
        {title}
        <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      {isOpen && <div className="collapsible-content">{children}</div>}
    </div>
  );
};

function AboutUs() {
  return (
    <div className="about-us-container">
      <section className="developers-section">
        <h2>Meet the Team</h2>
        <div className="developer-cards-container">
          <div className="developer-card leader">
            <h3>Ammaar Alam</h3>
            <p>Lead Developer</p>
            <div className="developer-links">
              <a href="#" target="_blank" rel="noopener noreferrer">[GitHub]</a>
              <a href="#" target="_blank" rel="noopener noreferrer">[Website]</a>
            </div>
          </div>
          <div className="developer-card">
            <h3>Ryan Chen</h3>
            <p>Developer</p>
            <div className="developer-links">
              <a href="#" target="_blank" rel="noopener noreferrer">[GitHub]</a>
              <a href="#" target="_blank" rel="noopener noreferrer">[Website]</a>
            </div>
          </div>
          <div className="developer-card">
            <h3>William Guan</h3>
            <p>Developer</p>
            <div className="developer-links">
              <a href="#" target="_blank" rel="noopener noreferrer">[GitHub]</a>
              <a href="#" target="_blank" rel="noopener noreferrer">[Website]</a>
            </div>
          </div>
        </div>
      </section>

      <section className="info-section">
        <h2>Learn More</h2>

        <CollapsibleSection title="About TigerType">
          <p>
            TigerType is a real-time typing competition platform developed as a final project for Princeton University's COS 333 course. 
            Inspired by platforms like MonkeyType and TypeRacer, TigerType allows users to practice typing on their own, 
            create private lobbies with shareable invite codes to race against friends, or join a public queue to compete against 
            other Princeton users.
          </p>
          <p>
            Our goal is to provide a fun, engaging, and Princeton-themed environment for improving typing skills, 
            complete with performance analytics and friendly competition.
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="How It Works">
          <h4>Stats Calculation</h4>
          <p>
            Your typing performance is measured primarily by Words Per Minute (WPM) and Accuracy.
          </p>
          <ul>
            <li><strong>WPM:</strong> Calculated based on the standard definition where one 'word' equals 5 characters (including spaces and punctuation). We count the number of correct characters you type and divide by 5, then normalize this to a per-minute rate based on the time elapsed.</li>
            <li><strong>Accuracy:</strong> Calculated as the percentage of correctly typed characters out of the total characters attempted in the snippet.</li>
          </ul>
          
          <h4>Quick Match</h4>
          <p>
            Want to race against random opponents? Select "Quick Match" to join a public queue. The system will automatically match you with other available Princeton users for a real-time race.
          </p>

          <h4>Private Lobbies</h4>
          <p>
            To race specifically against friends, use the "Create Lobby" option. You'll receive a unique invite code that you can share. Friends can use this code to join your private race lobby.
          </p>

          <h4>Leaderboards</h4>
          <p>
            Track your progress and see how you stack up against the competition! The leaderboards rank users based on performance metrics like WPM and accuracy over different time periods.
          </p>
        </CollapsibleSection>
      </section>
    </div>
  );
}

// Added PropTypes for CollapsibleSection for better type checking
import PropTypes from 'prop-types';

CollapsibleSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};


export default AboutUs;