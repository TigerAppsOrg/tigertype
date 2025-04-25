// [AI DISCLAIMER: THIS COMPONENT WAS DEBUGGED WITH THE HELP OF AI; IT MIGHT NOT BE FULLY ACCURATE
import React from 'react';
import PropTypes from 'prop-types';
import './TestConfigurator.css';

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
const TYPES = ['all', 'general', 'princeton', 'course_reviews'];
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
}) {

  const [departments, setDepartments] = React.useState(['all']); // State for dynamic departments
  const isMounted = React.useRef(false); // Ref to track initial mount

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

  // Updated renderButton to handle department clicks and remove non-functional logic/title
  const renderButton = (value, state, setter, label, icon = null, isFunctional = true, onClickOverride = null) => (
    <button
      key={value}
      className={`config-button ${state === value ? 'active' : ''} ${icon ? 'icon-button' : ''}`} // Removed non-functional class logic here
      onClick={() => {
        if (onClickOverride) {
          onClickOverride();
          return;
        }
        // Removed isFunctional check as we assume all rendered buttons are functional now

        // Handle different types of buttons
        if (value === 'timed' || value === 'snippet') {
          // Mode buttons
          handleModeChange(value, setter);
        } else if (setter === setTestDuration) {
          // Duration buttons
          handleDurationChange(value);
        } else if (setter === setSnippetDepartment) {
           // Department buttons - directly set state, useEffect handles reload
           setter(value);
        } else {
          // Fallback for any other potential buttons
          setter(value);
        }
      }}
      title={label || value} // Removed conditional title
      aria-label={label || value}
    >
      {icon && icon()} {label || value}
    </button>
  );


  return (
    // Main container
    <div className={`test-configurator ${isLobby ? 'lobby' : ''}`}>

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
             <div className="select-wrapper">
                <DifficultyIcon />
                <select
                  className="config-select" // Removed non-functional
                  value={snippetDifficulty}
                  onChange={handleSelectChange(setSnippetDifficulty)}
                  // title removed
                >
                  <option value="" disabled hidden={snippetDifficulty !== ""}>difficulty</option>
                  {DIFFICULTIES.map(diff => <option key={diff} value={diff}>{diff}</option>)}
                </select>
             </div>
             <div className="config-separator-inner"></div>
             <div className="select-wrapper">
                <TypeIcon />
                <select
                  className="config-select" // Removed non-functional
                  value={snippetType}
                  onChange={handleSelectChange(setSnippetType)}
                  // title removed
                >
                  <option value="" disabled hidden={snippetType !== ""}>type</option>
                  {TYPES.map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
                </select>
             </div>
             <div className={`department-filter ${snippetType === 'course_reviews' ? 'visible' : ''}`}>
                <div className="config-separator-inner"></div>
                 {/* Render departments dynamically */}
                {departments.map(dept => renderButton(dept, snippetDepartment, setSnippetDepartment, dept, null, true))}
              </div>
            </div>
          </div>

          {/* Timed Mode Duration Wrapper */}
        <div className={`options-wrapper timed-options ${testMode === 'timed' ? 'visible' : ''}`}>
          <div className="config-section duration-selection-inner">
            {DURATIONS.map(duration => renderButton(duration, testDuration, setTestDuration, `${duration}s`))}
          </div>
        </div>

      </div> {/* End Conditional Options Container */}

      {/* Separator */}
      <div className="config-separator"></div>

      {/* Leaderboard Button (always visible in practice mode) */}
      <div className="config-section leaderboard-button-section">
        {renderButton('leaderboard', null, null, 'Leaderboard', LeaderboardIcon, true, onShowLeaderboard)}
      </div>
    </div> // End Main Container
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