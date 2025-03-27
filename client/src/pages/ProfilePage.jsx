import React from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

function ProfilePage() {
  const { user, loading } = useAuth();

  // Parse numeric values to ensure they're numbers
  const parseNumericValue = (value) => {
    if (value === null || value === undefined) return 0;
    return typeof value === 'string' ? parseFloat(value) : value;
  };

  if (loading) {
    return <div className="loading-container">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
        <div className="profile-info">
          <h2>{user?.netid || 'Guest'}</h2>
        </div>
      </div>

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