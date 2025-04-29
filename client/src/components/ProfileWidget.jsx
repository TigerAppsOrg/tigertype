// merge conflict debugged with ai

import PropTypes from 'prop-types';
import ProfileModal from './ProfileModal.jsx';
import { useState, useEffect } from 'react';
import './ProfileWidget.css';
import axios from 'axios';

// Default profile image
import defaultProfileImage from '../assets/icons/default-profile.svg';

function ProfileWidget({ user, onClick }) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  // Local state for titles (use provided or fetch)
  const [titles, setTitles] = useState(user?.titles || []);

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

  // Fetch titles if not provided
  useEffect(() => {
    if (user?.titles) {
      setTitles(user.titles);
    } else if (user?.netid) {
      axios.get(`/api/user/${user.netid}/titles`)
        .then(res => setTitles(res.data || []))
        .catch(err => {
          console.error(`Error fetching titles for ${user.netid}:`, err);
          setTitles([]);
        });
    }
  }, [user?.netid, user?.titles]);

  // Only display the most recent/unlocked title
  const selectedTitle = titles && titles.length > 0 ? titles[0] : null;
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
        {/* Display selected title */}
        {selectedTitle && (
          <div className="profile-titles">
            <span className="profile-title-badge">
              {selectedTitle.name}
            </span>
          </div>
        )}
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
