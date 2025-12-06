import React from 'react';
import PropTypes from 'prop-types';
import './SegmentedToggle.css';

function SegmentedToggle({
  options,
  value,
  onChange,
  className = '',
  ariaLabel,
}) {
  const activeIndexRaw = options.findIndex(option => option.value === value);
  const activeIndex = activeIndexRaw >= 0 ? activeIndexRaw : 0;
  const total = options.length || 1;
  const classes = ['segmented-toggle', className].filter(Boolean).join(' ');

  const handleKeyDown = (event, index) => {
    if (!options.length) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (index + 1) % total;
      onChange(options[next].value);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (index - 1 + total) % total;
      onChange(options[prev].value);
    }
  };

  return (
    <div
      className={classes}
      role="tablist"
      aria-label={ariaLabel}
      style={{ '--segments': total, '--active-index': activeIndex }}
    >
      <div className="segmented-highlight" aria-hidden="true" />
      {options.map((option, index) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`segmented-option ${isActive ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span className="segmented-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

SegmentedToggle.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    label: PropTypes.node.isRequired,
  })).isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default SegmentedToggle;
