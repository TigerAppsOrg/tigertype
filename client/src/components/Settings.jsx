import './Settings.css';
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRace } from '../context/RaceContext';
import { useAuth } from '../context/AuthContext';

const SETTINGS_TABS = ['appearance', 'behavior', 'audio', 'changelog'];

function Settings({ isOpen, onClose, initialTab = 'appearance' }) {

  const { wordDifficulty, setWordDifficulty, raceState, loadNewSnippet, testMode, testDuration } = useRace();
  const { user, setUser, markChangelogSeen } = useAuth();

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

  const [defaultCursor, setDefaultCursor] = useState(() => {
    try {
      const t = localStorage.getItem('cursorType');
      if (t === 'caret') return false;
      return true; // default to block
    } catch {
      return true;
    }
  });
  const [glideCursor, setGlideCursor] = useState(() => {
    const v = localStorage.getItem('glideCursor');
    return v === null ? true : v === 'true';
  });

  const modalRef = useRef(); // Create a ref for the modal content
  const typingInputRef = document.querySelector('.typing-input-container input');

  // Tabbed layout: show one section at a time
  const tabs = SETTINGS_TABS;
  const initialTabIndex = Math.max(0, tabs.indexOf(initialTab));
  const [activeTab, setActiveTab] = useState(tabs[initialTabIndex]);
  const [activeIndex, setActiveIndex] = useState(initialTabIndex);
  const [animDirection, setAnimDirection] = useState(null); // 'up' | 'down' | null
  const [changelogEntries, setChangelogEntries] = useState([]);
  const [isChangelogLoading, setIsChangelogLoading] = useState(false);
  const [changelogError, setChangelogError] = useState(null);
  const [hasFetchedChangelog, setHasFetchedChangelog] = useState(false);
  const [hasMarkedChangelog, setHasMarkedChangelog] = useState(false);
  const wasOpenRef = useRef(false);
  const prevInitialTabRef = useRef(initialTab);

  useEffect(() => {
    const targetTab = tabs.includes(initialTab) ? initialTab : 'appearance';
    const targetIndex = Math.max(0, tabs.indexOf(targetTab));
    const initialChanged = initialTab !== prevInitialTabRef.current;

    if (isOpen && (!wasOpenRef.current || initialChanged)) {
      setActiveTab(tabs[targetIndex]);
      setActiveIndex(targetIndex);
      setAnimDirection(null);
    }

    if (!isOpen) {
      wasOpenRef.current = false;
    } else {
      wasOpenRef.current = true;
    }

    prevInitialTabRef.current = initialTab;
  }, [isOpen, initialTab, tabs]);

  useEffect(() => {
    if (isOpen) {
      setHasFetchedChangelog(false);
      setHasMarkedChangelog(false);
      setChangelogEntries([]);
      setChangelogError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'changelog') return;
    if (hasFetchedChangelog || isChangelogLoading) return;

    let cancelled = false;
    setIsChangelogLoading(true);

    axios.get('/api/changelog/entries?limit=20')
      .then(({ data }) => {
        if (cancelled) return;
        const entries = Array.isArray(data?.entries) ? data.entries : [];
        setChangelogEntries(entries);
        setHasFetchedChangelog(true);
        setChangelogError(null);

        const latest = entries[0] || null;
        const latestId = latest?.id ?? null;
        const lastSeenId = data?.last_seen_id ?? null;

        if (setUser) {
          setUser({
            latest_changelog_id: latestId ?? null,
            latest_changelog_title: latest?.title ?? null,
            latest_changelog_published_at: latest?.published_at ?? latest?.merged_at ?? null,
            has_unseen_changelog: latestId ? latestId !== lastSeenId : false,
            last_seen_changelog_id: lastSeenId ?? null
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading changelog entries:', err);
        setChangelogError('Unable to load recent updates right now.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsChangelogLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, hasFetchedChangelog, setUser]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'changelog') return;
    if (!user?.has_unseen_changelog) return;
    if (!changelogEntries.length) return;
    if (hasMarkedChangelog) return;

    const latestId = changelogEntries[0]?.id;
    if (!latestId) return;

    markChangelogSeen(latestId)
      .then(() => setHasMarkedChangelog(true))
      .catch((err) => {
        console.error('Error marking changelog as seen:', err);
      });
  }, [isOpen, activeTab, changelogEntries, user?.has_unseen_changelog, hasMarkedChangelog, markChangelogSeen]);

  useEffect(() => {
    if (user?.has_unseen_changelog) {
      setHasMarkedChangelog(false);
    }
  }, [user?.has_unseen_changelog]);

  const handleTabChange = (nextTab) => {
    const nextIndex = tabs.indexOf(nextTab);
    if (nextIndex === -1) return;
    setAnimDirection(nextIndex > activeIndex ? 'down' : 'up');
    setActiveIndex(nextIndex);
    setActiveTab(nextTab);
  };

  // Apply fonts when component mounts or fonts change
  useEffect(() => {
    document.documentElement.style.setProperty('--main-font', whichFont);
    document.documentElement.style.setProperty('--snippet-font-size', `${fontSize}px`);
    localStorage.setItem('preferredFont', whichFont);
    localStorage.setItem('typingSound', typingSound);
    localStorage.setItem('snippetFontSize', fontSize.toString());
    localStorage.setItem('theme', theme);
    // Word difficulty persistence is managed by RaceContext

    if (theme === 'tangerine') {
      document.documentElement.style.setProperty('--primary-color', '#FF6B35');
      document.documentElement.style.setProperty('--primary-color-rgb', '255, 107, 53');
      document.documentElement.style.setProperty('--secondary-color', '#2B1810');
      document.documentElement.style.setProperty('--mode-text-color', '#FFE5D9');
      document.documentElement.style.setProperty('--hover-color', '#3D2418');
      document.documentElement.style.setProperty('--type-container-color', '#2B1810');
      document.documentElement.style.setProperty('--container-color', '#1F120A');
      document.documentElement.style.setProperty('--typing-color', '#FFE5D9');
      document.documentElement.style.setProperty('--player-card-color', '#3D2418');

      document.documentElement.style.setProperty('--background-color', '#1A0E08');
      document.documentElement.style.setProperty('--background-color-secondary', '#2B1810');

      document.documentElement.style.setProperty('--text-color', '#FFE5D9');
      document.documentElement.style.setProperty('--text-color-secondary', '#FFB799');
      document.documentElement.style.setProperty('--text-color-highlight', '#FFFFFF');
      document.documentElement.style.setProperty('--subtle-text-color', 'rgba(255, 229, 217, 0.7)');

      document.documentElement.style.setProperty('--correct-bg-color', '#4CAF50');
      document.documentElement.style.setProperty('--incorrect-color', '#FF5252');
      document.documentElement.style.setProperty('--incorrect-bg-color', 'rgba(255,82,82, 0.25)');
      document.documentElement.style.setProperty('--current-color', '#FF6B35');

      document.documentElement.style.setProperty('--caret-color', '#FF6B35');

      document.documentElement.style.setProperty('--mode-title-color', '#FF6B35');
      document.documentElement.style.setProperty('--stat-card-color', 'rgba(255, 107, 53, 0.15)');
      document.documentElement.style.setProperty('--developer-link-color', '#FF9568');
      document.documentElement.style.setProperty('--developer-link-hover-color', '#FF6B35');
      document.documentElement.style.setProperty('--modal-bg-color', '#2B1810');
      document.documentElement.style.setProperty('--button-bg-color', 'rgba(255, 107, 53, 0.2)');
      
      document.documentElement.style.setProperty('--background-color-tertiary', '#1A0E08');
      document.documentElement.style.setProperty('--text-color-tertiary', '#CC9980');

      document.documentElement.style.setProperty('--border-color', '#4A2E1F');
      // Glass variables for warm tangerine
      document.documentElement.style.setProperty('--glass-surface', 'rgba(43,24,16,0.85)');
      document.documentElement.style.setProperty('--glass-card', 'rgba(61,36,24,0.75)');
      document.documentElement.style.setProperty('--glass-border', 'rgba(255,107,53,0.15)');
      document.documentElement.style.setProperty('--input-bg', '#3D2418');
      document.documentElement.style.setProperty('--input-border', 'rgba(255,107,53,0.25)');
      document.documentElement.style.setProperty('--toggle-bg', 'rgba(255,107,53,0.12)');
      document.documentElement.style.setProperty('--toggle-border', 'rgba(255,107,53,0.2)');
      document.documentElement.style.setProperty('--thumb-color', '#FFE5D9');
      // Segmented control for tangerine
      document.documentElement.style.setProperty('--segmented-bg', 'rgba(245,130,31,0.12)');
      document.documentElement.style.setProperty('--segmented-text', 'rgba(255,255,255,0.65)');
      document.documentElement.style.setProperty('--segmented-active', 'linear-gradient(135deg, #FF6B35, #FF8C5A)');
      document.documentElement.style.setProperty('--segmented-active-text', '#ffffff');
      // Select arrow for tangerine
      document.documentElement.style.setProperty('--select-arrow-color', '%23F5821F');
      // Slider track for tangerine
      document.documentElement.style.setProperty('--slider-track-bg', 'rgba(245,130,31,0.15)');
      document.documentElement.style.setProperty('--slider-track-border', 'rgba(245,130,31,0.25)');
    }
    else if (theme === 'lavender-asphalt') {
      document.documentElement.style.setProperty('--mode-text-color', '#A59EB5'); //
      document.documentElement.style.setProperty('--hover-color', '#2a2a2a'); //
      
      document.documentElement.style.setProperty('--player-card-color', '#aeaeae'); //

      document.documentElement.style.setProperty('--background-color', '#2C2C34'); //
      document.documentElement.style.setProperty('--primary-color', '#C2AEDD') //
      document.documentElement.style.setProperty('--primary-color-rgb', '194, 174, 221');
      document.documentElement.style.setProperty('--secondary-color', '#2A2831'); // refined base
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
      document.documentElement.style.setProperty('--modal-bg-color', '#2A2831'); //
      document.documentElement.style.setProperty('--button-bg-color', 'rgba(125, 125, 125, 0.8)'); //
      // Glass tuning for lavender
      document.documentElement.style.setProperty('--glass-surface', 'rgba(36,34,41,0.75)');
      document.documentElement.style.setProperty('--glass-card', 'rgba(48,46,54,0.65)');
      document.documentElement.style.setProperty('--glass-border', 'rgba(255,255,255,0.08)');
      document.documentElement.style.setProperty('--input-bg', '#2C2A33');
      document.documentElement.style.setProperty('--input-border', 'rgba(255,255,255,0.12)');
      document.documentElement.style.setProperty('--toggle-bg', 'rgba(255,255,255,0.08)');
      document.documentElement.style.setProperty('--toggle-border', 'rgba(255,255,255,0.12)');
      document.documentElement.style.setProperty('--thumb-color', '#fff');
      // Segmented control for lavender
      document.documentElement.style.setProperty('--segmented-bg', 'rgba(194,174,221,0.15)');
      document.documentElement.style.setProperty('--segmented-text', 'rgba(255,255,255,0.65)');
      document.documentElement.style.setProperty('--segmented-active', 'linear-gradient(135deg, #C2AEDD, #9B7FC4)');
      document.documentElement.style.setProperty('--segmented-active-text', '#ffffff');
      // Select arrow for lavender
      document.documentElement.style.setProperty('--select-arrow-color', '%23C2AEDD');
      // Slider track for lavender
      document.documentElement.style.setProperty('--slider-track-bg', 'rgba(194,174,221,0.15)');
      document.documentElement.style.setProperty('--slider-track-border', 'rgba(194,174,221,0.25)');
    }
    else if (theme === 'light') {
      document.documentElement.style.setProperty('--primary-color', '#F58025');
      document.documentElement.style.setProperty('--primary-color-rgb', '245, 128, 37');
      document.documentElement.style.setProperty('--secondary-color', '#f7f7f8');
      document.documentElement.style.setProperty('--mode-text-color', '#191a1c');
      document.documentElement.style.setProperty('--hover-color', '#c9c9cf');
      document.documentElement.style.setProperty('--type-container-color', '#ffffff');
      document.documentElement.style.setProperty('--container-color', '#ffffff');
      document.documentElement.style.setProperty('--typing-color', '#191a1c');
      document.documentElement.style.setProperty('--player-card-color', '#f0f0f2');

      document.documentElement.style.setProperty('--background-color', '#fbfbfc');
      document.documentElement.style.setProperty('--background-color-secondary', '#f0f1f4');

      document.documentElement.style.setProperty('--text-color', '#191a1c');
      document.documentElement.style.setProperty('--text-color-secondary', '#4b4f56');
      document.documentElement.style.setProperty('--text-color-highlight', '#000000');
      document.documentElement.style.setProperty('--subtle-text-color', 'rgba(30, 33, 39, 0.7)');

      document.documentElement.style.setProperty('--correct-bg-color', '#0A970A');
      document.documentElement.style.setProperty('--incorrect-color', '#FF0000');
      document.documentElement.style.setProperty('--incorrect-bg-color', 'rgba(255,116,108, 0.30)');
      document.documentElement.style.setProperty('--current-color', '#000000');

      document.documentElement.style.setProperty('--caret-color', '#F58025')

      document.documentElement.style.setProperty('--mode-title-color', '#F58025');
      document.documentElement.style.setProperty('--stat-card-color', 'rgba(175, 175, 175, 0.4)');
      document.documentElement.style.setProperty('--developer-link-color', '#FFAD6B');
      document.documentElement.style.setProperty('--developer-link-hover-color', '#C25A00');
      document.documentElement.style.setProperty('--modal-bg-color', '#ffffff');
      document.documentElement.style.setProperty('--button-bg-color', '#e7e7ea');
      
      document.documentElement.style.setProperty('--background-color-tertiary', '#eceef2');
      document.documentElement.style.setProperty('--text-color-tertiary', '#6f7480');

      document.documentElement.style.setProperty('--border-color', '#3a3a3a');
      // Glass variables for light
      document.documentElement.style.setProperty('--glass-surface', 'rgba(255,255,255,0.95)');
      document.documentElement.style.setProperty('--glass-card', 'rgba(255,255,255,0.98)');
      document.documentElement.style.setProperty('--glass-border', 'rgba(0,0,0,0.08)');
      document.documentElement.style.setProperty('--input-bg', '#ffffff');
      document.documentElement.style.setProperty('--input-border', 'rgba(0,0,0,0.12)');
      document.documentElement.style.setProperty('--toggle-bg', 'rgba(0,0,0,0.05)');
      document.documentElement.style.setProperty('--toggle-border', 'rgba(0,0,0,0.08)');
      document.documentElement.style.setProperty('--thumb-color', '#ffffff');
      // Segmented control for light
      document.documentElement.style.setProperty('--segmented-bg', 'rgba(0,0,0,0.06)');
      document.documentElement.style.setProperty('--segmented-text', 'rgba(0,0,0,0.6)');
      document.documentElement.style.setProperty('--segmented-active', '#ffffff');
      document.documentElement.style.setProperty('--segmented-active-text', '#1a1d23');
      // Select arrow for light mode
      document.documentElement.style.setProperty('--select-arrow-color', '%236b7280');
      // Slider track for light mode
      document.documentElement.style.setProperty('--slider-track-bg', 'rgba(0,0,0,0.08)');
      document.documentElement.style.setProperty('--slider-track-border', 'rgba(0,0,0,0.12)');
    }
    else { // Default: Dark Mode
      document.documentElement.style.setProperty('--primary-color', '#F5821F');
      document.documentElement.style.setProperty('--primary-color-rgb', '245, 130, 31');
      document.documentElement.style.setProperty('--secondary-color', '#1e1e1e');
      document.documentElement.style.setProperty('--mode-text-color', '#e0e0e0');
      document.documentElement.style.setProperty('--hover-color','#2a2a2a');
      document.documentElement.style.setProperty('--type-container-color', '#1e1e1e');
      document.documentElement.style.setProperty('--container-color', '#1A1A1A');
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
      document.documentElement.style.setProperty('--modal-bg-color', '#1b1e23');
      document.documentElement.style.setProperty('--button-bg-color', '#3a3a3a');

      document.documentElement.style.setProperty('--background-color-tertiary', '#2a2a2a');
      document.documentElement.style.setProperty('--text-color-tertiary', '#888888');

      document.documentElement.style.setProperty('--border-color', '#2b3038');
      // Glass variables for default dark
      document.documentElement.style.setProperty('--glass-surface', 'rgba(20,22,27,0.75)');
      document.documentElement.style.setProperty('--glass-card', 'rgba(30,33,40,0.65)');
      document.documentElement.style.setProperty('--glass-border', 'rgba(255,255,255,0.08)');
      document.documentElement.style.setProperty('--input-bg', '#0f1115');
      document.documentElement.style.setProperty('--input-border', 'rgba(255,255,255,0.12)');
      document.documentElement.style.setProperty('--toggle-bg', 'rgba(255,255,255,0.08)');
      document.documentElement.style.setProperty('--toggle-border', 'rgba(255,255,255,0.12)');
      document.documentElement.style.setProperty('--thumb-color', '#fff');
      // Segmented control for dark
      document.documentElement.style.setProperty('--segmented-bg', 'rgba(255,255,255,0.08)');
      document.documentElement.style.setProperty('--segmented-text', 'rgba(255,255,255,0.65)');
      document.documentElement.style.setProperty('--segmented-active', 'linear-gradient(135deg, #F58025, #E85D20)');
      document.documentElement.style.setProperty('--segmented-active-text', '#ffffff');
      // Select arrow for dark
      document.documentElement.style.setProperty('--select-arrow-color', '%23F58025');
      // Slider track for dark
      document.documentElement.style.setProperty('--slider-track-bg', 'rgba(255,255,255,0.08)');
      document.documentElement.style.setProperty('--slider-track-border', 'rgba(255,255,255,0.12)');
      // Segmented control for tangerine
      document.documentElement.style.setProperty('--segmented-bg', 'rgba(255,255,255,0.08)');
      document.documentElement.style.setProperty('--segmented-text', 'rgba(255,255,255,0.65)');
      document.documentElement.style.setProperty('--segmented-active', 'linear-gradient(135deg, #F58025, #E85D20)');
      document.documentElement.style.setProperty('--segmented-active-text', '#ffffff');
      // Select arrow for tangerine
      document.documentElement.style.setProperty('--select-arrow-color', '%23F58025');
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
    document.documentElement.setAttribute('data-cursor', defaultCursor ? 'block' : 'caret');
    try {
      localStorage.setItem('cursorType', defaultCursor ? 'block' : 'caret');
    } catch {}
  }, [defaultCursor, theme]);

  // Persist smooth cursor glide preference and expose to CSS
  useEffect(() => {
    localStorage.setItem('glideCursor', glideCursor ? 'true' : 'false');
    // 1 => enabled, 0 => disabled (used by CSS and Typing.jsx)
    document.documentElement.style.setProperty('--glide-cursor-enabled', glideCursor ? '1' : '0');
    document.documentElement.setAttribute('data-glide', glideCursor ? '1' : '0');
  }, [glideCursor]);

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

  const handleGlideToggle = () => {
    setGlideCursor(prev => !prev);
  };

  const handleSoundToggle = () => {
    setTypingSound(prev => !prev);
  };

  const handleWordDifficultyChange = (difficulty) => {
    setWordDifficulty(difficulty);
    // Reload snippet when difficulty changes - works for both practice and timed tests
    // Pass current testMode and testDuration directly to ensure correct reload
    loadNewSnippet(testMode, testDuration);
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

  const formatDate = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (err) {
      return '';
    }
  };

  const parseLabels = (labels) => {
    if (!labels) return [];
    if (Array.isArray(labels)) return labels;
    if (typeof labels === 'string') {
      try {
        const parsed = JSON.parse(labels);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
    }
    return [];
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal" ref={modalRef}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="settings-body">
          {/* Sidebar navigation */}
          <aside className="settings-sidebar">
            <button
              type="button"
              className={`nav-pill ${activeTab === 'appearance' ? 'active' : ''}`}
              aria-current={activeTab === 'appearance' ? 'page' : undefined}
              onClick={() => handleTabChange('appearance')}
            >
              Appearance
            </button>
            <button
              type="button"
              className={`nav-pill ${activeTab === 'behavior' ? 'active' : ''}`}
              aria-current={activeTab === 'behavior' ? 'page' : undefined}
              onClick={() => handleTabChange('behavior')}
            >
              Behavior
            </button>
            <button
              type="button"
              className={`nav-pill ${activeTab === 'audio' ? 'active' : ''}`}
              aria-current={activeTab === 'audio' ? 'page' : undefined}
              onClick={() => handleTabChange('audio')}
            >
              Audio
            </button>
            <div className="nav-divider" role="separator" aria-hidden="true" />
            <button
              type="button"
              className={`nav-pill ${activeTab === 'changelog' ? 'active' : ''}`}
              aria-current={activeTab === 'changelog' ? 'page' : undefined}
              onClick={() => handleTabChange('changelog')}
            >
              Changelog
              {user?.has_unseen_changelog && <span className="nav-pill-badge">New</span>}
            </button>
          </aside>

          {/* Panels */}
          <div className="settings-panels">

            {activeTab === 'appearance' && (
            <section id="appearance" className={`settings-card panel-anim ${animDirection === 'down' ? 'from-down' : animDirection === 'up' ? 'from-up' : ''}`}>
              <h3 className="settings-card-title">Appearance</h3>

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

              <div className="setting-item setting-item-select">
                <label htmlFor="font-select">
                  Font
                  <span className="info-icon" data-tooltip="Select your preferred font for all text on the site.">ⓘ</span>
                </label>
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
                <label htmlFor="font-size-slider">
                  Excerpt Font Size
                  <span className="info-icon" data-tooltip="Adjust the font size of the text/excerpt within the snippet display.">ⓘ</span>
                </label>
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
                <label id="cursor-style-label">
                  Cursor Style
                  <span className="info-icon" data-tooltip="Choose between block (rectangle) and caret (line) cursor styles.">ⓘ</span>
                </label>
                <div className="toggle">
                  <button
                    id="block-cursor-toggle"
                    type="button"
                    aria-pressed={defaultCursor}
                    aria-labelledby="cursor-style-label"
                    className={`cursor-visual-toggle ${defaultCursor ? 'block' : 'caret'}`}
                    onClick={handleDefaultCursor}
                  >
                    <span className="thumb" />
                    <span className="segment">Block</span>
                    <span className="segment">Caret</span>
                  </button>
                </div>
              </div>

              <div className="setting-item setting-item-toggle">
                <span id="glide-cursor-label">
                  Smooth Cursor Glide
                  <span className="info-icon" data-tooltip="When enabled, the cursor smoothly slides to the next character as you type. Works for both block and line cursors.">ⓘ</span>
                </span>
                <div className="toggle">
                  <label className="switch">
                    <input
                      id="glide-cursor-toggle"
                      type="checkbox"
                      aria-labelledby="glide-cursor-label"
                      checked={glideCursor}
                      onChange={handleGlideToggle}
                    />
                    <span className="slider"></span>
                  </label>
                  <span className="sound-label">{glideCursor ? ' On' : ' Off'}</span>
                </div>
              </div>
            </section>
            )}

            {activeTab === 'behavior' && (
            <section id="behavior" className={`settings-card panel-anim ${animDirection === 'down' ? 'from-down' : 'from-up'}`}>
              <h3 className="settings-card-title">Behavior</h3>
              <div className="setting-item">
                <label id="word-difficulty-label">
                  Word Difficulty
                  <span
                    className="info-icon"
                    data-tooltip={"Easy: Word pool consists of the 200 most common English words, which are more familiar.\nHard: Word pool includes the 1000 most common English words, adding less frequently used words."}
                  >ⓘ</span>
                </label>
                <div
                  className="difficulty-toggle-group"
                  id="word-difficulty-toggle"
                  role="group"
                  aria-labelledby="word-difficulty-label"
                >
                  <button
                    className={`difficulty-toggle-btn ${wordDifficulty === 'easy' ? 'active' : ''}`}
                    onClick={() => handleWordDifficultyChange('easy')}
                  >
                    Easy
                  </button>
                  <button
                    className={`difficulty-toggle-btn ${wordDifficulty === 'hard' ? 'active' : ''}`}
                    onClick={() => handleWordDifficultyChange('hard')}
                  >
                    Hard
                  </button>
                </div>
              </div>
            </section>
            )}

            {activeTab === 'audio' && (
            <section id="audio" className={`settings-card panel-anim ${animDirection === 'down' ? 'from-down' : 'from-up'}`}>
              <h3 className="settings-card-title">Audio</h3>
              <div className="setting-item setting-item-toggle">
                <span id="sound-toggle-label">
                  Typing Sound
                  <span className="info-icon" data-tooltip="Enable or disable sound effects for typing. Sound effects are played when a letter is typed correctly.">ⓘ</span>
                </span>
                <div className="toggle">
                  <label className="switch">
                    <input
                      id="sound-toggle"
                      type="checkbox"
                      aria-labelledby="sound-toggle-label"
                      checked={typingSound}
                      onChange={handleSoundToggle}
                    />
                    <span className="slider"></span>
                  </label>
                  <span className="sound-label">{typingSound ? ' On' : ' Off'}</span>
                </div>
              </div>
            </section>
            )}

            {activeTab === 'changelog' && (
            <section id="changelog" className={`settings-card panel-anim ${animDirection === 'down' ? 'from-down' : 'from-up'}`}>
              <h3 className="settings-card-title">Changelog</h3>

              {isChangelogLoading && (
                <div className="changelog-state">Loading latest updates…</div>
              )}

              {!isChangelogLoading && changelogError && (
                <div className="changelog-state changelog-error">{changelogError}</div>
              )}

              {!isChangelogLoading && !changelogError && changelogEntries.length === 0 && (
                <div className="changelog-state">No changelog entries yet. Merged pull requests will appear here automatically.</div>
              )}

              {!isChangelogLoading && !changelogError && changelogEntries.length > 0 && (
                <div className="changelog-list">
                  {changelogEntries.map((entry) => {
                    const labels = parseLabels(entry.labels);
                    const timestamp = entry.published_at || entry.merged_at;
                    return (
                      <article key={entry.id} className="changelog-item">
                        <header className="changelog-item-header">
                          <h4>{entry.title}</h4>
                          {timestamp && <time dateTime={timestamp}>{formatDate(timestamp)}</time>}
                        </header>
                        {labels.length > 0 && (
                          <ul className="changelog-labels">
                            {labels.map((label) => (
                              <li key={label}>{label}</li>
                            ))}
                          </ul>
                        )}
                        {entry.body && (
                          <div className="changelog-body">
                            <ReactMarkdown
                              className="changelog-markdown"
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ node, ...props }) => (
                                  <a {...props} target="_blank" rel="noreferrer noopener" />
                                ),
                                table: ({ node, ...props }) => (
                                  <div className="changelog-table-wrapper">
                                    <table {...props} />
                                  </div>
                                )
                              }}
                            >
                              {entry.body}
                            </ReactMarkdown>
                          </div>
                        )}
                        {entry.url && (
                          <a
                            className="changelog-link"
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            View pull request
                          </a>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Settings.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialTab: PropTypes.oneOf(['appearance', 'behavior', 'audio', 'changelog'])
};

export default Settings;
