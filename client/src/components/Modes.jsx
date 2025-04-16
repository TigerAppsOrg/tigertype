import PropTypes from 'prop-types';
import './Modes.css';

function Modes({ modes, children }) {
  return (
    <div className="modes-container">
      {modes.map((mode) => (
        <div
          key={mode.id}
          className={`mode-box ${mode.disabled ? 'mode-disabled' : ''}`}
          onClick={mode.disabled ? null : mode.action}
        >
          <h3>{mode.name}</h3>
          <p>{mode.description}</p>
          {mode.disabled && <span className="coming-soon-badge">Coming Soon</span>}
        </div>
      ))}
      {children}
    </div>
  );
}

Modes.propTypes = {
  modes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      action: PropTypes.func,
      disabled: PropTypes.bool
    })
  ).isRequired
};

export default Modes;