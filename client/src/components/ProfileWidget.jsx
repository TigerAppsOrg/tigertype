import PropTypes from 'prop-types';
import ProfileModal from './ProfileModal.jsx';
import { useState } from 'react';
import './ProfileWidget.css';

// Default profile image
import defaultProfileImage from '../assets/icons/default-profile.svg';

function ProfileWidget({ user, onClick }) {
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Parse numeric value to handle string or number
  const parseNumericValue = (value) => {
    if (value === null || value === undefined) return 0;
    return typeof value === 'string' ? parseFloat(value) : value;
  };
  
  // Define these functions at component level, not inside conditional branches
  const openProfileModal = () => {
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
  };

  const content = (
    <div className="profile-widget">
      <div className="profile-image">
        <img
          src={user?.avatar_url ? user.avatar_url : defaultProfileImage} 
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

  // If onClick is provided, use that handler instead of showing the modal
  if (onClick) {
    return (
      <div className="profile-widget-clickable" onClick={onClick} role="button" tabIndex={0}>
        {content}
      </div>
    );
  }

  // Otherwise, use our own modal
  return (
    <>
      <div className="profile-widget-clickable" onClick={openProfileModal} role="button" tabIndex={0}>
        {content}
      </div>
      
      {showProfileModal && (<ProfileModal 
      isOpen={showProfileModal} 
      onClose={closeProfileModal} 
      />)}
    </>
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
  onClick: PropTypes.func
};

export default ProfileWidget;
