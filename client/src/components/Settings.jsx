import './Settings.css';
import { useState, useEffect, useRef } from 'react';

function Settings({ isOpen, onClose }) {

  const [whichFont, setWhichFont] = useState(() => {
    return localStorage.getItem('preferredFont') || 'Fira Code, monospace';
  });

  const [typingSound, setTypingSound] = useState(() => {
    return localStorage.getItem('typingSound') === 'true';
  });

  const [theme, setTheme] = useState(() => {
    // Default to 'dark' if no theme is stored or if stored value is invalid
    const storedTheme = localStorage.getItem('theme');
    return storedTheme === 'light' ? 'light' : 'dark'; 
  });

  const [defaultCursor, setDefaultCursor] = useState(true);

  const modalRef = useRef(); // Create a ref for the modal content

  // Apply fonts when component mounts or fonts change
  useEffect(() => {
    document.documentElement.style.setProperty('--main-font', whichFont);
    document.documentElement.style.setProperty(
      '--background-color', theme === 'light' ? '#ffffff' : '#121212'
    );
    document.documentElement.style.setProperty(
      '--secondary-color', theme === 'light' ? '#f0f0f0' : '#1e1e1e'
    );
    document.documentElement.style.setProperty(
      '--mode-text-color', theme === 'light' ? '#1e1e1e' : '#e0e0e0'
    );
    document.documentElement.style.setProperty(
      '--hover-color', theme === 'light' ? '#a2a2a2' : '#2a2a2a'
    );
    document.documentElement.style.setProperty(
      '--type-container-color', theme === 'light' ? '#dfdfdf' : '#1e1e1e'
    );
    document.documentElement.style.setProperty(
      '--typing-color', theme === 'light' ? 'black' : '#ffffff53'
    );
    document.documentElement.style.setProperty(
      '--container-color', theme === 'light' ? '#ffffff' : '#121212'
    );
    document.documentElement.style.setProperty(
      '--player-card-color', theme === 'light' ? '#aeaeae' : '#2a2a2a'
    );
    document.documentElement.style.setProperty(
      '--correct-bg-color', 
      theme === 'light' ? '#0A970A' : 'rgba(128, 239, 128, 0.55)'
    );
    document.documentElement.style.setProperty(
      '--incorrect-color',
      theme === 'light' ? '#FF0000' : 'rgba(255, 65, 47, 0.55)'
    );
    document.documentElement.style.setProperty(
      '--incorrect-bg-color',
      theme === 'light' ? 'rgba(255,116,108, 0.30)' : 'rgba(255,116,108, 0.10)'
    );
    document.documentElement.style.setProperty(
      '--current-color',
      theme === 'light' ? 'black' : 'white'
    );
    localStorage.setItem('preferredFont', whichFont);
    localStorage.setItem('typingSound', typingSound);
    localStorage.setItem('theme', theme); // Store theme string
  }, [whichFont, typingSound, theme]); // Depend on theme state

  useEffect(() => {
    const color = defaultCursor ? "#3a506b" : "none";
    const line = defaultCursor ? "hidden" : "visible";
    document.documentElement.style.setProperty('--default-cursor', color);
    document.documentElement.style.setProperty('--line-cursor', line);
  }, [defaultCursor]);

  // Handle closing modal on outside click or ESC key
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Close if clicked outside the modal content area
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscapeKey = (event) => {
      // Close if Escape key is pressed
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // Add event listeners when the modal is open
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);
    } else {
      // Clean up listeners when modal is closed
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    }

    // Cleanup function to remove listeners when the component unmounts or isOpen changes
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]); // Re-run effect if isOpen or onClose changes

  if (!isOpen) {return null};

  const handleTypingFontChange = (e) => {
    const newFont = e.target.value;
    setWhichFont(newFont);
  };

  const handleDefaultCursor = (e) => {
    setDefaultCursor(!defaultCursor);
  };

  const handleSoundToggle = () => {
    setTypingSound(prev => !prev);
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal" ref={modalRef}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="settings-content">
          {/* Customization Category */}
          <h3>Customization</h3>
          <div className="setting-item">
            <label htmlFor="font-select">Fonts</label>
            <select 
              id="font-select"
              className="font-select" 
              value={whichFont} 
              onChange={handleTypingFontChange}
            >
              <option value="Inter, monospace">Inter</option>
              <option value="Fira Code, monospace">Fira Code</option>
              <option value="Courier New, monospace">Courier New</option>
              <option value="Source Code Pro, monospace">Source Code Pro</option>
              <option value="JetBrains Mono, monospace">JetBrains Mono</option>
              <option value="Monaco, monospace">Monaco</option>
            </select>
          </div>
          <div className="setting-item">
            <label htmlFor="block-cursor-toggle">Block Cursor</label>
            <div className="toggle">
              <label className="switch">
                <input 
                  className='cursor-setting' 
                  type='checkbox' 
                  checked={defaultCursor} 
                  onChange={handleDefaultCursor} />
                <span className="slider"></span>
              </label>
              <span className="sound-label">{defaultCursor ? ' On' : ' Off'}</span>
            </div>
          </div>
          <div className="setting-item">
            <label htmlFor="sound-toggle">Typing Sound</label>
            <div className="toggle">
              <label className="switch">
                <input
                  id="sound-toggle"
                  type="checkbox"
                  checked={typingSound}
                  onChange={handleSoundToggle}
                />
                <span className="slider"></span>
              </label>
              <span className="sound-label">{typingSound ? ' On' : ' Off'}</span>
            </div>
          </div>

          <div className="setting-item">
            <label htmlFor="theme-select">Theme</label>
            <select
              id="theme-select"
              className="theme-select" 
              value={theme}
              onChange={handleThemeChange}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          
          {/* Add more categories below as needed */}

        </div>
      </div>
    </div>
  );
}

export default Settings;