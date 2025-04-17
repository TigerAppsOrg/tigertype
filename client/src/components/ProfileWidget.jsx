import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './ProfileWidget.css';

// Default profile image
import defaultProfileImage from '../assets/icons/default-profile.svg';

function ProfileWidget({ user, onClick }) { // Added onClick prop
  // Parse numeric value to handle string or number
  const parseNumericValue = (value) => {
    if (value === null || value === undefined) return 0;
    return typeof value === 'string' ? parseFloat(value) : value;
  };

  const content = (
    <div className="profile-widget">
      <div className="profile-image">
        <img
            src={ user?.avatar_url ? user.avatar_url : defaultProfileImage } 
          alt="Profile"
        />
      </div>
      <div className="profile-info">
        <div className="profile-name">{user?.netid || 'Guest'}</div>
          <div className="profile-details">
            {user?.avg_wpm
              ? `${Math.round(parseNumericValue(user.avg_wpm))} WPM`
              : 'No stats yet'
          }
        </div>
      </div>
    </div>
  );

  // If onClick is provided, wrap content in a button/div and attach handler
  if (onClick) {
    return (
      <div className="profile-widget-clickable" onClick={onClick} role="button" tabIndex={0}>
        {content}
      </div>
    );
  }

  // Otherwise, wrap in the default Link
  return (
    <Link to="/profile" className="profile-widget-link">
      {content}
    </Link>
  );
}

ProfileWidget.propTypes = {
  user: PropTypes.shape({
    netid: PropTypes.string,
    avatar_url: PropTypes.string,
    avg_wpm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    avg_accuracy: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    races_completed: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }),
  onClick: PropTypes.func // Added prop type for onClick
};

export default ProfileWidget;
