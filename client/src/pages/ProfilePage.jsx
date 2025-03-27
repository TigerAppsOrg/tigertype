import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    racesCompleted: 0,
    averageWPM: 0,
    averageAccuracy: 0
  });

  // Fetch user stats from backend
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await fetch('/api/users/stats', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setStats({
            racesCompleted: data.races_completed,
            averageWPM: data.avg_wpm,
            averageAccuracy: data.avg_accuracy
          });
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    };

    fetchUserStats();
  }, []);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
        <div className="profile-info">
          <h2>{user?.netid || 'Loading...'}</h2>
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
            <p>{stats.averageWPM.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3>Average Accuracy</h3>
            <p>{stats.averageAccuracy.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage; 