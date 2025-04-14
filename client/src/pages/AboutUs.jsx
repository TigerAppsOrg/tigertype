// [AI-DISCLAIMER: THE COLLAPSIBLE SECTION TEXT AI GENERATED]
import React, { useState } from 'react';
import './AboutUs.css';

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
      <header className="about-us-header">
        <h1>About TigerType</h1>
        <p className="about-us-subtitle">Meet the team</p>
      </header>

      <section className="developers-section">
        <h2>Our Team</h2>
        <div className="developer-cards-container">
          <div className="developer-card">
            <div className="developer-image-container">
              <div className="developer-image">
                <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Ryan Chen" />
              </div>
            </div>
            <h3>Ryan Chen</h3>
            <p className="developer-role">Frontend Developer</p>
            <p className="developer-bio">Princeton '27 - Computer Science</p>
            <div className="developer-links">
              <a href="https://github.com/rc6542" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://www.linkedin.com/in/ryan-chen-2369a4289/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </div>
          
          <div className="developer-card leader">
            <div className="developer-image-container">
              <div className="developer-image">
                <img src="https://media.licdn.com/dms/image/v2/D4E03AQF2NVaZwBFgtg/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1718231509781?e=1750291200&v=beta&t=YPYS9f3_3ptRrCgKTFV4djUvZAsgKRzLeEAU0ygNoqo" alt="Ammaar Alam" />
              </div>
              <div className="leader-badge">Project Lead</div>
            </div>
            <h3>Ammaar Alam</h3>
            <p className="developer-role">Full Stack Developer</p>
            <p className="developer-bio">Princeton '27 - Computer Science</p>
            <div className="developer-links">
              <a href="https://github.com/ammaar-alam" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://ammaaralam.com" target="_blank" rel="noopener noreferrer">Website</a>
            </div>
          </div>
          
          <div className="developer-card">
            <div className="developer-image-container">
              <div className="developer-image">
                <img src="https://media.licdn.com/dms/image/v2/D4D03AQFxz0EUKZnBhw/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1695095743340?e=1750291200&v=beta&t=CwOt8lkzXGpadwDx-EFKiJeGe-N2Q67eHUKztvOMh9w" alt="William Guan" />
              </div>
            </div>
            <h3>William Guan</h3>
            <p className="developer-role">Frontend Developer</p>
            <p className="developer-bio">Princeton '27 - Computer Science</p>
            <div className="developer-links">
              <a href="https://github.com/wg6872" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://www.linkedin.com/in/wei-feng-guan-407a00217/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </div>
        </div>
      </section>

      <section className="info-section">
        <h2>Learn More</h2>

        {/* [AI-DISCLAIMER] THE FOLLOWING TEXT WAS AI GENERATED */}
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
        
        <CollapsibleSection title="Understanding Statistics">
          <h4>Platform Statistics</h4>
          <p>
            Our platform showcases the following key statistics on the landing page:
          </p>
          <ul>
            <li><strong>Races Completed:</strong> The total number of typing races and timed tests that have been fully completed by all users. This counts only sessions where users typed the entire text or finished the timed duration.</li>
            <li><strong>Tests Started:</strong> The total number of typing sessions initiated by all users, including both completed sessions and those that weren't finished. This includes when a user starts typing but presses TAB to restart or abandons a session before completion.</li>
            <li><strong>Words Typed:</strong> The total number of words typed across all sessions on TigerType. We count words from both completed races and partial sessions, so every word you type contributes to this statistic, even if you don't finish a test.</li>
            <li><strong>Avg. WPM:</strong> The average typing speed across all completed tests on the platform.</li>
            <li><strong>Active Tigers:</strong> The number of Princeton users who have registered on TigerType.</li>
          </ul>

          <h4>Personal Statistics</h4>
          <p>
            Your profile page shows both standard and detailed statistics:
          </p>
          
          <p><strong>Standard Stats:</strong></p>
          <ul>
            <li><strong>Races Completed:</strong> The number of typing tests you've fully completed.</li>
            <li><strong>Average WPM:</strong> Your average typing speed across all completed tests.</li>
            <li><strong>Average Accuracy:</strong> Your average typing accuracy across all completed tests.</li>
            <li><strong>Fastest Speed:</strong> Your highest recorded WPM from any completed test.</li>
          </ul>
          
          <p><strong>Detailed Stats:</strong></p>
          <ul>
            <li><strong>Total Sessions Started:</strong> All typing sessions you've initiated, whether completed or not.</li>
            <li><strong>Sessions Completed:</strong> The number of tests you've finished without restarting.</li>
            <li><strong>Total Words Typed:</strong> All words you've typed on TigerType, including those from sessions you didn't complete. Each keystroke counts!</li>
            <li><strong>Completion Rate:</strong> The percentage of started tests that you've completed. This is calculated as (Sessions Completed / Total Sessions Started) × 100%.</li>
          </ul>
          
          <h4>How Data Is Tracked</h4>
          <p>
            TigerType carefully tracks your typing activity using several methods:
          </p>
          <ul>
            <li><strong>Completed Tests:</strong> When you finish a typing test, we record your WPM, accuracy, completion time, and the snippet you typed.</li>
            <li><strong>Timed Tests:</strong> For timed mode, we track how many words you successfully typed during the set duration.</li>
            <li><strong>Partial Sessions:</strong> When you press TAB to restart a test or otherwise abandon a session before completion, we still count the words you typed up to that point. This ensures you get credit for all your typing practice, even if you decide to restart.</li>
          </ul>
          
          <p>
            All these metrics help you understand your typing performance comprehensively and show your improvement over time.
          </p>
        </CollapsibleSection>
      </section>
    </div>
  );
}

// PropTypes for collapsible for better type checking
import PropTypes from 'prop-types';

CollapsibleSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};


export default AboutUs;