import './Settings.css';
import { useState, useEffect } from 'react';

function Settings({ isOpen, onClose }) {

  const [whichTypingFont, setWhichTypingFont] = useState(() => {
    return localStorage.getItem('preferredTypingFont') || 'Fira Code, monospace';
  });

  const [typingSound, setTypingSound] = useState(() => {
    return localStorage.getItem('typingSound') === 'true';
  });

  // Apply fonts when component mounts or fonts change
  useEffect(() => {
    document.documentElement.style.setProperty('--main-font', whichTypingFont);
    localStorage.setItem('preferredTypingFont', whichTypingFont);
    localStorage.setItem('typingSound', typingSound);
  }, [whichTypingFont, typingSound]);

  if (!isOpen) return null;

  const handleTypingFontChange = (e) => {
    const newFont = e.target.value;
    setWhichTypingFont(newFont);
  };

  const handleSoundToggle = () => {
    setTypingSound(prev => !prev);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="settings-content">
          <p>Fonts</p>
          <select 
            className="font-select" 
            value={whichTypingFont} 
            onChange={handleTypingFontChange}
          >
            <option value="Inter, monospace">Inter</option>
            <option value="Fira Code, monospace">Fira Code</option>
            <option value="Courier New, monospace">Courier New</option>
            <option value="Source Code Pro, monospace">Source Code Pro</option>
            <option value="JetBrains Mono, monospace">JetBrains Mono</option>
            <option value="Monaco, monospace">Monaco</option>
          </select>

          <p>Typing Sound</p>
          <div className="sound-toggle">
            <label className="switch">
              <input
                type="checkbox"
                checked={typingSound}
                onChange={handleSoundToggle}
              />
              <span className="slider"></span>
            </label>
            <span className="sound-label">{typingSound ? ' On' : ' Off'}</span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Settings;