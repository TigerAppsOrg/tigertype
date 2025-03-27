import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    racesCompleted: 0,
    averageWPM: 0,
    bestWPM: 0
  });

  // TODO: Fetch user stats from backend
  useEffect(() => {
    // This would be replaced with an actual API call
    setStats({
      racesCompleted: 0,
      averageWPM: 0,
      bestWPM: 0
    });
  }, []);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
        <div className="profile-info">
          <h2>{user?.username || 'Username'}</h2>
          <p>{user?.email || 'email@example.com'}</p>
        </div>
      </div>

      <div className="profile-stats">
        <h2>Your Stats</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Races Completed</h3>
            <p>{stats.racesCompleted}</p>
          </div>
          <div className="stat-card">
            <h3>Average WPM</h3>
            <p>{stats.averageWPM}</p>
          </div>
          <div className="stat-card">
            <h3>Best WPM</h3>
            <p>{stats.bestWPM}</p>
          </div>
        </div>
      </div>

      <div className="profile-settings">
        <h2>Settings</h2>
        <div className="settings-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              defaultValue={user?.username || ''}
              placeholder="Enter new username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              defaultValue={user?.email || ''}
              placeholder="Enter new email"
            />
          </div>
          <button className="save-button">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage; 