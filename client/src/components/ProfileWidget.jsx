import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './ProfileWidget.css';

// Default profile image
import defaultProfileImage from '../assets/default-profile.svg';

function ProfileWidget({ user }) {
  return (
    <Link to="/profile" className="profile-widget-link">
      <div className="profile-widget">
        <div className="profile-image">
          <img src={defaultProfileImage} alt="Profile" />
        </div>
        <div className="profile-info">
          <div className="profile-name">{user?.netid || 'Guest'}</div>
          <div className="profile-details">
            {user?.avg_wpm ? `${Math.round(user.avg_wpm)} WPM` : 'No stats yet'}
          </div>
        </div>
      </div>
    </Link>
  );
}

ProfileWidget.propTypes = {
  user: PropTypes.shape({
    netid: PropTypes.string,
    avg_wpm: PropTypes.number,
    avg_accuracy: PropTypes.number,
    races_completed: PropTypes.number
  })
};

export default ProfileWidget;