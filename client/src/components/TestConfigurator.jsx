// [AI DISCLAIMER: THIS COMPONENT WAS DEBUGGED WITH THE HELP OF AI; IT MIGHT NOT BE FULLY ACCURATE
import React from 'react';
import PropTypes from 'prop-types';
import './TestConfigurator.css';
import TutorialAnchor from './TutorialAnchor';

// --- Icon Placeholders ---
const ClockIcon = () => <i className="bi bi-clock"></i>;
const QuoteIcon = () => <i className="bi bi-quote"></i>;
const DifficultyIcon = () => <i className="bi bi-bar-chart-line"></i>;
const TypeIcon = () => <i className="bi bi-tags"></i>;
const DepartmentIcon = () => <i className="bi bi-building"></i>;
const LeaderboardIcon = () => <i className="bi bi-trophy"></i>;
// --- ---

// --- Configuration Options ---
const DURATIONS = [15, 30, 60, 120];
const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];
const TYPES = ['all', 'general', 'course_reviews'];
// --- ---

function TestConfigurator({
  testMode,
  testDuration,
  snippetDifficulty,
  snippetType,
  snippetDepartment,
  setTestMode,
  setTestDuration,
  setSnippetDifficulty,
  setSnippetType,
  setSnippetDepartment,
  setRaceState,
  loadNewSnippet,
  onShowLeaderboard,
  isLobby = false,
  snippetError = null,
}) {

  const [departments, setDepartments] = React.useState(['all']); // State for dynamic departments
  const isMounted = React.useRef(false); // Ref to track initial mount

  // Store available difficulties for the current type/department filters
  const [availableDifficulties, setAvailableDifficulties] = React.useState(DIFFICULTIES);

  // Fetch available difficulties when type or department filters change
  React.useEffect(() => {
    const fetchDifficulties = async () => {
      try {
        const params = new URLSearchParams({ type: snippetType, department: snippetDepartment });
        const response = await fetch(`/api/snippets/filters?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setAvailableDifficulties(data.difficulties || DIFFICULTIES);
      } catch (error) {
        console.error('Failed to fetch available difficulties:', error);
        setAvailableDifficulties(DIFFICULTIES);
      }
    };
    fetchDifficulties();
  }, [snippetType, snippetDepartment]);

  // Fetch departments on mount
  React.useEffect(() => {
    const fetchDepartments = async () => {
      try {
        // Assuming fetch is available or imported appropriately
        const response = await fetch('/api/snippets/course-subjects'); // Use the new API endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fetchedSubjects = await response.json();
        // Ensure 'all' is always the first option and handle potential duplicates if API includes 'all'
        setDepartments(['all', ...new Set(fetchedSubjects.filter(s => s !== 'all'))]);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
        // Keep the default ['all'] or set a specific error state if needed
      }
    };
    fetchDepartments();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Reset department if type changes away from course reviews
  React.useEffect(() => {
    if (snippetType !== 'course_reviews' && snippetDepartment !== 'all') {
      setSnippetDepartment('all');
    }
  }, [snippetType, snippetDepartment, setSnippetDepartment]);

  // Trigger snippet reload when filters change (after initial mount)
  React.useEffect(() => {
    // Only reload if it's not the initial mount and we are in snippet mode
    if (isMounted.current && testMode === 'snippet') {
       console.log('Snippet filter changed, loading new snippet...');
       loadNewSnippet && loadNewSnippet();
    }
  }, [snippetDifficulty, snippetType, snippetDepartment]); // Watch filter states

  // Track initial mount & ensure reload on mode switch to snippet
   React.useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
    } else if (testMode === 'snippet') {
      // Reload when switching *to* snippet mode after initial mount
      console.log('Switched to snippet mode, loading new snippet...');
      loadNewSnippet && loadNewSnippet();
    }
     // Optional: Cleanup function to reset ref on unmount
     return () => {
       // If component unmounts, reset isMounted (might not be strictly necessary)
       // isMounted.current = false;
     };
  }, [testMode]); // Watch testMode


  // Ensure the component always shows the current active test mode
  React.useEffect(() => {
    // When the component loads, make sure we're showing the correct mode's options
    if (testMode === 'timed' || testMode === 'snippet') {
      const timedOptions = document.querySelector('.timed-options');
      const snippetOptions = document.querySelector('.snippet-options');
      
      if (timedOptions) {
        timedOptions.classList.toggle('visible', testMode === 'timed');
      }
      
      if (snippetOptions) {
        snippetOptions.classList.toggle('visible', testMode === 'snippet');
      }
    }
  }, [testMode]);

  // Updated handler for select changes to directly set state
  // The useEffect hook above will handle reloading the snippet
  const handleSelectChange = (setter) => (event) => {
    setter(event.target.value);
  };

  // Enhanced button handler to immediately apply mode changes
  const handleModeChange = (value, setter) => {
    // First set the raceState.timedTest.enabled property
    if (value === 'timed') {
      // If switching to timed mode, enable it first
      setRaceState(prev => ({
        ...prev,
        timedTest: {
          ...prev.timedTest,
          enabled: true
        }
      }));
      
      // Then update the UI state to match
      setter(value);
      
      // Finally request a new timed test
      setTimeout(() => {
        loadNewSnippet && loadNewSnippet();
      }, 0);
    } 
    else if (value === 'snippet') {
      // If switching to snippet mode, disable timed mode first
      setRaceState(prev => ({
        ...prev,
        timedTest: {
          ...prev.timedTest,
          enabled: false
        }
      }));
      
      // Then update the UI state
      setter(value);
      
      // Finally request a new snippet
      setTimeout(() => {
        loadNewSnippet && loadNewSnippet();
      }, 0);
    }
  };

  // Handle duration changes - immediately update and reload if in timed mode
  const handleDurationChange = (duration) => {
    // First update the duration state
    setTestDuration(duration);
    
    // If we're in timed mode, update raceState and reload the test
    if (testMode === 'timed') {
      // Force reset race state completely 
      setRaceState(prev => ({
        ...prev,
        timedTest: {
          ...prev.timedTest,
          enabled: true,
          duration: duration
        },
        // Reset these values to force a "fresh start" even if selecting the same duration
        startTime: null,
        inProgress: false,
        completed: false,
        manuallyStarted: false
      }));
      
      // Reload with the new duration
      setTimeout(() => {
        loadNewSnippet && loadNewSnippet();
      }, 0);
    }
  };

  // ------------------------------
  // Rendering helpers
  // ------------------------------

  // Map of config values to tutorial anchorIds so individual buttons can be highlighted in the tutorial overlay.
  const BUTTON_ANCHOR_MAP = {
    snippet: 'mode-snippet',
    timed: 'mode-timed',
  };

  /**
   * Generic rendering helper for all configurator buttons.
   * Automatically wires up behaviour for mode switches, duration changes, etc.
   * If the given value is present in {@link BUTTON_ANCHOR_MAP} or represents one of the timed-mode duration
   * buttons, it will automatically be wrapped in a {@link TutorialAnchor} so the tutorial system can
   * reference the element.
   */
  const renderButton = (
    value,
    state,
    setter,
    label,
    icon = null,
    /* boolean */ isFunctional = true,
    /* function */ onClickOverride = null,
  ) => {
    // Determine whether we need to wrap the button in a tutorial anchor.
    const anchorId = BUTTON_ANCHOR_MAP[value] || (setter === setTestDuration ? 'timed-options' : null);

    const button = (
      <button
        key={value}
        data-testid={setter === setTestMode ? `mode-${value}` : undefined}
        className={`config-button ${state === value ? 'active' : ''} ${!isFunctional ? 'non-functional' : ''} ${icon ? 'icon-button' : ''}`}
        onClick={() => {
          // Allow a full override for custom behaviour (e.g. leaderboard modal)
          if (onClickOverride) {
            onClickOverride();
            return;
          }
          // Ignore clicks on non-functional buttons – they exist purely for UI preview.
          if (!isFunctional) return;

          // Handle the main button categories.
          if (value === 'timed' || value === 'snippet') {
            handleModeChange(value, setter);
          } else if (setter === setTestDuration) {
            handleDurationChange(value);
          } else if (setter) {
            // Generic setter (difficulty, type, department, etc.)
            setter(value);
          }
        }}
        title={!isFunctional ? 'Filter coming soon!' : label || value}
        aria-label={label || value}
      >
        {icon && icon()} {label || value}
      </button>
    );

    return anchorId ? (
      <TutorialAnchor anchorId={anchorId} key={value}>
        {button}
      </TutorialAnchor>
    ) : (
      button
    );
  };

  // ------------------------------
  // Render
  // ------------------------------

  return (
    <TutorialAnchor anchorId="configurator">
      <div className={`test-configurator ${isLobby ? 'lobby' : ''}`}> 
        {snippetError && <div className="config-error">{snippetError}</div>}
        {/* Mode Selection Group */}
        <div className="config-section mode-selection">
          {renderButton('snippet', testMode, setTestMode, 'Snippets', QuoteIcon)}
          {renderButton('timed', testMode, setTestMode, 'Timed', ClockIcon)}
        </div>

        {/* Separator */}
        <div className="config-separator"></div>

        {/* Conditional Options Area */}
        <div className="conditional-options-container">

          {/* Snippet Filters Wrapper */}
          <div className={`options-wrapper snippet-options ${testMode === 'snippet' ? 'visible' : ''}`}>
            <div className="config-section snippet-filters-inner">
              {/* Difficulty filter */}
              <div className="select-wrapper">
                <DifficultyIcon />
                <select
                  className="config-select"
                  value={snippetDifficulty}
                  onChange={handleSelectChange(setSnippetDifficulty)}
                >
                  <option value="" disabled hidden={snippetDifficulty !== ''}>difficulty</option>
                  {DIFFICULTIES.map(diff => (
                    <option
                      key={diff}
                      value={diff}
                      disabled={!availableDifficulties.includes(diff)}
                      title={!availableDifficulties.includes(diff) ? 'No snippets available for selected filters' : undefined}
                    >
                      {diff}
                    </option>
                  ))}
                </select>
              </div>

              <div className="config-separator-inner"></div>

              {/* Type filter */}
              <div className="select-wrapper">
                <TypeIcon />
                <select
                  className="config-select"
                  value={snippetType}
                  onChange={handleSelectChange(setSnippetType)}
                >
                  <option value="" disabled hidden={snippetType !== ''}>type</option>
                  {TYPES.map(type => (
                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Department filter – only shown for course reviews */}
              <div className={`department-filter ${snippetType === 'course_reviews' ? 'visible' : ''}`}>
                <div className="config-separator-inner"></div>
                <div className="select-wrapper">
                  <DepartmentIcon />
                  <select
                    className="config-select"
                    value={snippetDepartment}
                    onChange={handleSelectChange(setSnippetDepartment)}
                    aria-label="Select Department"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept === 'all' ? 'department' : dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Timed Mode Duration Wrapper */}
          <TutorialAnchor anchorId="timed-options">
            <div className={`options-wrapper timed-options ${testMode === 'timed' ? 'visible' : ''}`}>
              <div className="config-section duration-selection-inner">
                {DURATIONS.map(duration => renderButton(duration, testDuration, setTestDuration, `${duration}s`))}
              </div>
            </div>
          </TutorialAnchor>

        </div> {/* End Conditional Options Container */}

        {/* Separator */}
        <div className="config-separator"></div>

        {/* Leaderboard Button */}
        <div className="config-section leaderboard-button-section">
          {renderButton('leaderboard', null, null, 'Leaderboard', LeaderboardIcon, true, onShowLeaderboard)}
        </div>
      </div> {/* End test-configurator */}
    </TutorialAnchor>
  );
}

// Prop types remain the same
TestConfigurator.propTypes = {
  testMode: PropTypes.oneOf(['snippet', 'timed']).isRequired,
  testDuration: PropTypes.number.isRequired,
  snippetDifficulty: PropTypes.string.isRequired,
  snippetType: PropTypes.string.isRequired,
  snippetDepartment: PropTypes.string.isRequired,
  setTestMode: PropTypes.func.isRequired,
  setTestDuration: PropTypes.func.isRequired,
  setSnippetDifficulty: PropTypes.func.isRequired,
  setSnippetType: PropTypes.func.isRequired,
  setSnippetDepartment: PropTypes.func.isRequired,
  setRaceState: PropTypes.func.isRequired,
  loadNewSnippet: PropTypes.func,
  onShowLeaderboard: PropTypes.func.isRequired,
};

export default TestConfigurator;