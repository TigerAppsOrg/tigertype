import './Settings.css';
import { useState, useEffect } from 'react';

function Settings({ isOpen, onClose }) {
  const [whichFont, setWhichFont] = useState(() => {
    return sessionStorage.getItem('preferredFont') || 'Inter, sans-serif';
  });

  const [displayBlockCursor, setDisplayBlockCursor] = useState(() => {
    return sessionStorage.getItem('blockCursor') || '#3a506b';
  });

  // Apply font when component mounts or font changes
  useEffect(() => {
    document.documentElement.style.setProperty('--main-font', whichFont);
    sessionStorage.setItem('preferredFont', whichFont);
  }, [whichFont]);

  useEffect(() => {
    document.documentElement.style.setProperty('--display-block', displayBlockCursor);
    sessionStorage.setItem('blockCursor', displayBlockCursor);
  }, [displayBlockCursor])

  if (!isOpen) return null;

  const handleFontChange = (e) => {
    const newFont = e.target.value;
    setWhichFont(newFont);
  };

  const handleDisplayBlock = (e) => {
    if (e.target.checked === true) {
      setDisplayBlockCursor('#3a506b');
    } else {
      setDisplayBlockCursor('none');
    }
  }

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="settings-content">
          <p className='fonts'>Fonts</p>
          <select 
            className="font-select" 
            value={whichFont} 
            onChange={handleFontChange}
          >
            <option value="Inter, sans-serif">Inter</option>
            <option value="Courier New, monospace">Courier New</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Times New Roman, serif">Times New Roman</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'Roboto', sans-serif">Roboto</option>
            <option value="'Open Sans', sans-serif">Open Sans</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default Settings;