import PropTypes from 'prop-types';
import './Modes.css';
import TutorialAnchor from './TutorialAnchor';

/* helper so clicks on an embedded form don't trigger the card action */
const handleCardClick = (e, mode) => {
  if (mode.disabled) return;
  if (e.target.closest('.join-lobby-panel')) return; // ignore form area
  mode.action?.();
};

// Map each mode id to a tutorial anchorId
const anchorMap = {
  1: 'mode-practice',
  2: 'mode-quick',
  3: 'mode-create-private',
  4: 'mode-join-private'
};

function Modes({ modes }) {
  return (
    <div className="modes-container">
      {modes.map((mode) => {
        // Create the card element
        const card = (
          <div
            key={mode.id}
            className={`mode-box ${mode.disabled ? 'mode-disabled' : ''}`}
            onClick={(e) => handleCardClick(e, mode)}
          >
            {mode.iconClass && <i className={`mode-icon ${mode.iconClass}`}></i>}

            <h3>{mode.name}</h3>
            <p>{mode.description}</p>
            {mode.subComponent}
            {mode.disabled && (
              <span className="coming-soon-badge">Coming&nbsp;Soon</span>
            )}
          </div>
        );

        // Wrap with TutorialAnchor if there's an anchorId for this mode
        const anchorId = anchorMap[mode.id];
        return anchorId ? (
          <TutorialAnchor anchorId={anchorId} key={mode.id}>
            {card}
          </TutorialAnchor>
        ) : (
          card
        );
      })}
    </div>
  );
}

Modes.propTypes = {
  modes: PropTypes.arrayOf(
    PropTypes.shape({
      id:           PropTypes.number.isRequired,
      name:         PropTypes.string.isRequired,
      description:  PropTypes.string.isRequired,
      action:       PropTypes.func,
      disabled:     PropTypes.bool,
      subComponent: PropTypes.node,
      iconClass:    PropTypes.string
    })
  ).isRequired
};

export default Modes;
