import React from 'react';
import PropTypes from 'prop-types';
import './TestConfigurator.css';

// --- Icon Placeholders ---
const ClockIcon = () => <i className="bi bi-clock"></i>;
const QuoteIcon = () => <i className="bi bi-quote"></i>;
const DifficultyIcon = () => <i className="bi bi-bar-chart-line"></i>;
const TypeIcon = () => <i className="bi bi-tags"></i>;
const DepartmentIcon = () => <i className="bi bi-building"></i>;
// --- ---

// --- Configuration Options ---
const DURATIONS = [15, 30, 60, 120];
const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];
const TYPES = ['all', 'general', 'princeton', 'course_reviews'];
const DEPARTMENTS = ['all', 'COS', 'CHM', 'PHY'];
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
}) {

  React.useEffect(() => {
    if (snippetType !== 'course_reviews' && snippetDepartment !== 'all') {
      setSnippetDepartment('all');
    }
  }, [snippetType, snippetDepartment, setSnippetDepartment]);

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

  const handleSelectChange = (setter) => (event) => {
    setter(event.target.value);
  };

  // Enhanced button handler to immediately apply mode changes
  const handleModeChange = (value, setter) => {
    setter(value);
    
    // If switching to timed mode, immediately enable it in the race context
    if (value === 'timed') {
      setRaceState(prev => ({
        ...prev,
        timedTest: {
          ...prev.timedTest,
          enabled: true
        }
      }));
      
      // Also request a new timed test
      loadNewSnippet && loadNewSnippet();
    } 
    // If switching to snippet mode, immediately disable timed mode
    else if (value === 'snippet') {
      setRaceState(prev => ({
        ...prev,
        timedTest: {
          ...prev.timedTest,
          enabled: false
        }
      }));
      
      // Also request a new snippet
      loadNewSnippet && loadNewSnippet();
    }
  };

  const renderButton = (value, state, setter, label, icon = null, isFunctional = true) => (
    <button
      key={value}
      className={`config-button ${state === value ? 'active' : ''} ${!isFunctional ? 'non-functional' : ''} ${icon ? 'icon-button' : ''}`}
      onClick={() => isFunctional && (value === 'timed' || value === 'snippet' ? handleModeChange(value, setter) : setter(value))}
      title={!isFunctional ? 'Filter coming soon!' : label || value}
      aria-label={label || value}
    >
      {icon && icon()} {label || value}
    </button>
  );

  return (
    // Main container - now a row
    <div className="test-configurator">

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
                  className="config-select non-functional"
                  value={snippetDifficulty}
                  onChange={handleSelectChange(setSnippetDifficulty)}
                  title="Difficulty filter coming soon!"
                >
                  <option value="" disabled hidden={snippetDifficulty !== ""}>difficulty</option>
                  {DIFFICULTIES.map(diff => <option key={diff} value={diff}>{diff}</option>)}
                </select>
             </div>
             <div className="config-separator-inner"></div>
             <div className="select-wrapper">
                <TypeIcon />
                <select
                  className="config-select non-functional"
                  value={snippetType}
                  onChange={handleSelectChange(setSnippetType)}
                  title="Type filter coming soon!"
                >
                  <option value="" disabled hidden={snippetType !== ""}>type</option>
                  {TYPES.map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
                </select>
             </div>
             <div className={`department-filter ${snippetType === 'course_reviews' ? 'visible' : ''}`}>
                <div className="config-separator-inner"></div>
                {DEPARTMENTS.map(dept => renderButton(dept, snippetDepartment, setSnippetDepartment, dept, null, false))}
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
};

export default TestConfigurator;