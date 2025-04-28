import './Settings.css';
import { useState, useEffect, useRef } from 'react';

function Settings({ isOpen, onClose }) {

  // Define our font size options as 5 distinct sizes
  const fontSizeOptions = [
    { value: 18, label: 'XS' },
    { value: 24, label: 'S' },
    { value: 36, label: 'M' },
    { value: 48, label: 'L' },
    { value: 64, label: 'XL' }
  ];

  const [whichFont, setWhichFont] = useState(() => {
    return localStorage.getItem('preferredFont') || 'Fira Code, monospace';
  });

  const [typingSound, setTypingSound] = useState(() => {
    return localStorage.getItem('typingSound') === 'true';
  });

  const [theme, setTheme] = useState(() => {
    // Default to 'dark' if no theme is stored or if stored value is invalid
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'tangerine') {
      return 'tangerine'
    }
    else if (storedTheme === 'lavender-asphalt') {
      return 'lavender-asphalt';
    } else if (storedTheme === 'light') {
      return 'light';
    } else {
      return 'dark'; 
    }
  });

  const [fontSize, setFontSize] = useState(() => {
    // Get stored font size or use default medium (24px)
    const storedSize = localStorage.getItem('snippetFontSize');
    if (!storedSize) return 36; // Default to medium
    
    // Find the closest size in our options
    const parsedSize = parseInt(storedSize, 10);
    const sizeOption = fontSizeOptions.reduce((prev, curr) => {
      return Math.abs(curr.value - parsedSize) < Math.abs(prev.value - parsedSize) ? curr : prev;
    }, fontSizeOptions[1]); // Start with medium as default comparison
    
    return sizeOption.value;
  });

  const [defaultCursor, setDefaultCursor] = useState(true);

  const modalRef = useRef(); // Create a ref for the modal content
  const typingInputRef = document.querySelector('.typing-input-container input');

  // Apply fonts when component mounts or fonts change
  useEffect(() => {
    document.documentElement.style.setProperty('--main-font', whichFont);
    document.documentElement.style.setProperty('--snippet-font-size', `${fontSize}px`);
    localStorage.setItem('preferredFont', whichFont);
    localStorage.setItem('typingSound', typingSound);
    localStorage.setItem('snippetFontSize', fontSize.toString());

    localStorage.setItem('theme', theme);

    if (theme === 'tangerine') {
      document.documentElement.style.setProperty('--primary-color', '#F5821F');
      document.documentElement.style.setProperty('--secondary-color', '#F7EDE4');
      document.documentElement.style.setProperty('--mode-text-color', '#214E34');
      document.documentElement.style.setProperty('--hover-color', '#a2a2a2');
      document.documentElement.style.setProperty('--type-container-color', '#FFF8F2');
      document.documentElement.style.setProperty('--container-color', '#D7BFB1');
      document.documentElement.style.setProperty('--typing-color', '#FFB577');
      document.documentElement.style.setProperty('--player-card-color', '#aeaeae');

      document.documentElement.style.setProperty('--background-color', '#F5D8C4');
      document.documentElement.style.setProperty('--background-color-secondary', '#F0CDB3');

      document.documentElement.style.setProperty('--text-color', '#214E34');
      document.documentElement.style.setProperty('--text-color-secondary', '#505050');
      document.documentElement.style.setProperty('--text-color-highlight', '#000000');
      document.documentElement.style.setProperty('--subtle-text-color', 'rgba(60, 60, 60, 0.8)');

      document.documentElement.style.setProperty('--correct-bg-color', '#0A970A');
      document.documentElement.style.setProperty('--incorrect-color', '#FF0000');
      document.documentElement.style.setProperty('--incorrect-bg-color', 'rgba(255,116,108, 0.30)');
      document.documentElement.style.setProperty('--current-color', '#000000');

      document.documentElement.style.setProperty('--caret-color', '#F58025')

      document.documentElement.style.setProperty('--mode-title-color', '#F58025');
      document.documentElement.style.setProperty('--stat-card-color', 'rgba(175, 175, 175, 0.4)');
      document.documentElement.style.setProperty('--developer-link-color', '#FFAD6B');
      document.documentElement.style.setProperty('--developer-link-hover-color', '#C25A00');
      document.documentElement.style.setProperty('--modal-bg-color', '#DDDDDD');
      document.documentElement.style.setProperty('--button-bg-color', 'rgb(120, 120, 120)');
      
      document.documentElement.style.setProperty('--background-color-tertiary', '#d5d5d5');
      document.documentElement.style.setProperty('--text-color-tertiary', '#888888');

      document.documentElement.style.setProperty('--border-color', '#3a3a3a');
    }
    else if (theme === 'lavender-asphalt') {
      document.documentElement.style.setProperty('--mode-text-color', '#A59EB5'); //
      document.documentElement.style.setProperty('--hover-color', '#a2a2a2'); //
      
      document.documentElement.style.setProperty('--player-card-color', '#aeaeae'); //

      document.documentElement.style.setProperty('--background-color', '#2C2C34'); //
      document.documentElement.style.setProperty('--primary-color', '#C2AEDD') //
      document.documentElement.style.setProperty('--secondary-color', '#3A3A42'); //
      document.documentElement.style.setProperty('--background-color-secondary', '#3A3A42'); //

      document.documentElement.style.setProperty('--type-container-color', '#2C2C34'); // 
      document.documentElement.style.setProperty('--container-color', '#2E2E33'); //
      
      document.documentElement.style.setProperty('--typing-color', '#7A7A80'); //
      document.documentElement.style.setProperty('--text-color', '#7A7A80'); //
      document.documentElement.style.setProperty('--text-color-secondary', '#F1F1F6'); //
      document.documentElement.style.setProperty('--text-color-highlight', '#FAD6EA'); //
      document.documentElement.style.setProperty('--subtle-text-color', '#9A9AA0'); //
      document.documentElement.style.setProperty('--caret-color', '#B24DAE') //

      document.documentElement.style.setProperty('--correct-bg-color', '#8AC49F'); //
      document.documentElement.style.setProperty('--incorrect-color', '#B5746C'); //
      document.documentElement.style.setProperty('--incorrect-bg-color', 'rgba(155, 100, 75, 0.3)'); //
      document.documentElement.style.setProperty('--current-color', '#A59EB5'); //

      document.documentElement.style.setProperty('--mode-title-color', '#B5746C'); //
      document.documentElement.style.setProperty('--stat-card-color', 'rgba(175, 175, 175, 0.4)'); //
      document.documentElement.style.setProperty('--developer-link-color', '#C2AEDD'); //
      document.documentElement.style.setProperty('--developer-link-hover-color', '#6B4796'); //
      document.documentElement.style.setProperty('--modal-bg-color', '#2E2E33'); //
      document.documentElement.style.setProperty('--button-bg-color', 'rgba(125, 125, 125, 0.8)'); //
    }
    else if (theme === 'light') {
      document.documentElement.style.setProperty('--primary-color', '#F5821F');
      document.documentElement.style.setProperty('--secondary-color', '#f0f0f0');
      document.documentElement.style.setProperty('--mode-text-color', '#1e1e1e');
      document.documentElement.style.setProperty('--hover-color', '#a2a2a2');
      document.documentElement.style.setProperty('--type-container-color', '#dfdfdf');
      document.documentElement.style.setProperty('--container-color', '#ffffff');
      document.documentElement.style.setProperty('--typing-color', '#000000');
      document.documentElement.style.setProperty('--player-card-color', '#aeaeae');

      document.documentElement.style.setProperty('--background-color', '#ffffff');
      document.documentElement.style.setProperty('--background-color-secondary', '#e0e0e0');

      document.documentElement.style.setProperty('--text-color', '#000000');
      document.documentElement.style.setProperty('--text-color-secondary', '#505050');
      document.documentElement.style.setProperty('--text-color-highlight', '#000000');
      document.documentElement.style.setProperty('--subtle-text-color', 'rgba(60, 60, 60, 0.8)');

      document.documentElement.style.setProperty('--correct-bg-color', '#0A970A');
      document.documentElement.style.setProperty('--incorrect-color', '#FF0000');
      document.documentElement.style.setProperty('--incorrect-bg-color', 'rgba(255,116,108, 0.30)');
      document.documentElement.style.setProperty('--current-color', '#000000');

      document.documentElement.style.setProperty('--caret-color', '#F58025')

      document.documentElement.style.setProperty('--mode-title-color', '#F58025');
      document.documentElement.style.setProperty('--stat-card-color', 'rgba(175, 175, 175, 0.4)');
      document.documentElement.style.setProperty('--developer-link-color', '#FFAD6B');
      document.documentElement.style.setProperty('--developer-link-hover-color', '#C25A00');
      document.documentElement.style.setProperty('--modal-bg-color', '#DDDDDD');
      document.documentElement.style.setProperty('--button-bg-color', 'rgb(120, 120, 120)');
      
      document.documentElement.style.setProperty('--background-color-tertiary', '#d5d5d5');
      document.documentElement.style.setProperty('--text-color-tertiary', '#888888');

      document.documentElement.style.setProperty('--border-color', '#3a3a3a');
    }
    else { // Default: Dark Mode
      document.documentElement.style.setProperty('--primary-color', '#F5821F');
      document.documentElement.style.setProperty('--secondary-color', '#1e1e1e');
      document.documentElement.style.setProperty('--mode-text-color', '#e0e0e0');
      document.documentElement.style.setProperty('--hover-color','#2a2a2a');
      document.documentElement.style.setProperty('--type-container-color', '#1e1e1e');
      document.documentElement.style.setProperty('--container-color', '#121212');
      document.documentElement.style.setProperty('--typing-color', '#ffffff53');
      document.documentElement.style.setProperty('--player-card-color', '#2a2a2a');

      document.documentElement.style.setProperty('--background-color', '#121212');
      document.documentElement.style.setProperty('--background-color-secondary', '#1e1e1e');

      document.documentElement.style.setProperty('--text-color', '#e0e0e0');
      document.documentElement.style.setProperty('--text-color-secondary', '#b0b0b0');
      document.documentElement.style.setProperty('--text-color-highlight', '#ffffff');
      document.documentElement.style.setProperty('--subtle-text-color', '#7A7A7A');

      document.documentElement.style.setProperty('--correct-bg-color', 'rgba(128, 239, 128, 0.55)');
      document.documentElement.style.setProperty('--incorrect-color', 'rgba(255, 65, 47, 0.55)');
      document.documentElement.style.setProperty('--incorrect-bg-color', 'rgba(255,116,108, 0.10)');
      document.documentElement.style.setProperty('--current-color', '#ffffff');

      document.documentElement.style.setProperty('--caret-color', '#F58025')

      document.documentElement.style.setProperty('--mode-title-color', '#F58025');
      document.documentElement.style.setProperty('--stat-card-color', 'rgba(30, 30, 30, 0.4)');
      document.documentElement.style.setProperty('--developer-link-color', '#C25A00');
      document.documentElement.style.setProperty('--developer-link-hover-color', '#FFAD6B');
      document.documentElement.style.setProperty('--modal-bg-color', '#222222');
      document.documentElement.style.setProperty('--button-bg-color', '#3a3a3a');

      document.documentElement.style.setProperty('--background-color-tertiary', '#2a2a2a');
      document.documentElement.style.setProperty('--text-color-tertiary', '#888888');

      document.documentElement.style.setProperty('--border-color', '#3a3a3a');
    }
  }, [whichFont, typingSound, theme, fontSize]);

  useEffect(() => {
    const block = defaultCursor ? "visible" : "hidden";
    const line = defaultCursor ? "hidden" : "visible";
    let color = "none";

    if (block === 'visible' && theme === 'tangerine') {
      color = '#8FAABD';
    }
    else if (block === 'visible' && theme === 'lavender-asphalt') {
      color = '#4A6A8C';
    }
    else if (block === 'visible' && theme === 'light') {
      color = "#8FAABD";
    } else if (block === 'visible') {
      color = "#3a506b";
    } else {
      color = "none";
    }

    document.documentElement.style.setProperty('--default-cursor', color);
    document.documentElement.style.setProperty('--line-cursor', line);
  }, [defaultCursor, theme]);

  // Handle closing modal on outside click or ESC key
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Close if clicked outside the modal content area
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
        setTimeout(() => {
          if (typingInputRef) {
            typingInputRef.focus();
          }
        }, 10);
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

  const handleFontSizeChange = (e) => {
    // Convert the slider value (0-4) to the corresponding font size
    const index = parseInt(e.target.value, 10);
    setFontSize(fontSizeOptions[index].value);
  };

  // Get font size label for display
  const getFontSizeLabel = () => {
    const option = fontSizeOptions.find(opt => opt.value === fontSize) || fontSizeOptions[1];
    return option.label;
  };

  // Get slider index value (0-4) from the current font size
  const getSliderValue = () => {
    return fontSizeOptions.findIndex(opt => opt.value === fontSize);
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
          <div className="setting-item setting-item-select">
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
          <div className="setting-item setting-item-slider">
            <label htmlFor="font-size-slider">Excerpt Font Size</label>
            <div className="slider-container">
              <input
                id="font-size-slider"
                type="range"
                min="0"
                max="4"
                step="1"
                value={getSliderValue()}
                onChange={handleFontSizeChange}
                className="font-size-slider"
                list="font-size-options"
              />
              <datalist id="font-size-options">
                {fontSizeOptions.map((_, index) => (
                  <option key={index} value={index} />
                ))}
              </datalist>
              <div className="font-size-markers">
                {fontSizeOptions.map((option, index) => (
                  <span key={index} className="size-marker">{option.label}</span>
                ))}
              </div>
              <span className="font-size-value">{fontSize}px</span>
            </div>
          </div>
          <div className="setting-item setting-item-toggle">
            <label htmlFor="block-cursor-toggle">Block Cursor</label>
            <div className="toggle">
              <label className="switch">
                <input 
                  className='cursor-setting' 
                  id="block-cursor-toggle"
                  type='checkbox' 
                  checked={defaultCursor} 
                  onChange={handleDefaultCursor} />
                <span className="slider"></span>
              </label>
              <span className="sound-label">{defaultCursor ? ' On' : ' Off'}</span>
            </div>
          </div>
          <div className="setting-item setting-item-toggle">
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

          <div className="setting-item setting-item-select">
            <label htmlFor="theme-select">Theme</label>
            <select
              id="theme-select"
              className="theme-select" 
              value={theme}
              onChange={handleThemeChange}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="lavender-asphalt">Lavender Asphalt</option>
              <option value="tangerine">Tangerine</option>
            </select>
          </div>
          
          {/* Add more categories below as needed */}

        </div>
      </div>
    </div>
  );
}

export default Settings;