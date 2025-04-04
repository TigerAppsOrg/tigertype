import './Settings.css';
import { useState, useEffect } from 'react';

function Settings({ isOpen, onClose }) {
  const [whichUIFont, setwhichUIFont] = useState(() => {
    return sessionStorage.getItem('preferredUIFont') || 'Inter, sans-serif';
  });

  const [whichTypingFont, setWhichTypingFont] = useState(() => {
    return sessionStorage.getItem('preferredTypingFont') || 'Fira Code, monospace';
  });

  // Apply fonts when component mounts or fonts change
  useEffect(() => {
    document.documentElement.style.setProperty('--main-font', whichUIFont);
    document.documentElement.style.setProperty('--typing-font', whichTypingFont);
    sessionStorage.setItem('preferredUIFont', whichUIFont);
    sessionStorage.setItem('preferredTypingFont', whichTypingFont);
  }, [whichUIFont, whichTypingFont]);

  if (!isOpen) return null;

  const handleUIFontChange = (e) => {
    const newFont = e.target.value;
    setwhichUIFont(newFont);
  };

  const handleTypingFontChange = (e) => {
    const newFont = e.target.value;
    setWhichTypingFont(newFont);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="settings-content">
          <p>UI Fonts</p>
          <select 
            className="font-select" 
            value={whichUIFont} 
            onChange={handleUIFontChange}
          >
            <option value="Inter, sans-serif">Inter</option>
            <option value="Courier New, monospace">Courier New</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Times New Roman, serif">Times New Roman</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'Roboto', sans-serif">Roboto</option>
            <option value="'Open Sans', sans-serif">Open Sans</option>
          </select>

          <p>Typing Fonts</p>
          <select 
            className="font-select" 
            value={whichTypingFont} 
            onChange={handleTypingFontChange}
          >
            <option value="Fira Code, monospace">Fira Code</option>
            <option value="Courier New, monospace">Courier New</option>
            <option value="Consolas, monospace">Consolas</option>
            <option value="Source Code Pro, monospace">Source Code Pro</option>
            <option value="JetBrains Mono, monospace">JetBrains Mono</option>
            <option value="Monaco, monospace">Monaco</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default Settings;