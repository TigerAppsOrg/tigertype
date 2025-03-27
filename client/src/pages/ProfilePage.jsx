import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import defaultProfileImage from '../assets/default-profile.svg'
import userEdit from '../assets/edit.png'

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Parse numeric values to ensure they're numbers
  const parseNumericValue = (value) => {
    if (value === null || value === undefined) return 0;
    return typeof value === 'string' ? parseFloat(value) : value;
  };

  const handleBack = () => {
    navigate('/home');
  };

  if (loading) {
    return <div className="loading-container">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <div className="back-button-container">
        <button className="back-button" onClick={handleBack}>
          <span>⟵</span> Back
        </button>
      </div>
      <div className="profile-header">
        <h1>Profile</h1>
        <div className="profile-page-info">
          <div className="profile-page-image">
            <input type="image" src={defaultProfileImage} alt="Profile" />
          </div>
          <div className="written-info">
            <div className="username-info">
              <h2>{user?.netid || 'Guest'}</h2>
              <input className="profile-user-edit" type='image' alt='edit pencil' src={userEdit}></input>
            </div>
            <textarea className="biography" placeholder='Write a little about yourself!'></textarea>
          </div>
        </div>
      </div>


      {/* We may want to make stats be dynamic (i.e. golden color) if they're exceptional */}
      <div className="profile-stats">
        <h2>Your Stats</h2>
        {!user ? (
          <div className="stats-loading">No stats available</div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Races Completed</h3>
              <p>{parseNumericValue(user.races_completed) || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Average WPM</h3>
              <p>{parseNumericValue(user.avg_wpm).toFixed(2)}</p>
            </div>
            <div className="stat-card">
              <h3>Average Accuracy</h3>
              <p>{parseNumericValue(user.avg_accuracy).toFixed(2)}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage; 