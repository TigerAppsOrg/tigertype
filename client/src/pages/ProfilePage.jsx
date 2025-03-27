import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

function ProfilePage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({
    racesCompleted: 0,
    averageWPM: 0,
    averageAccuracy: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch user stats from backend
  useEffect(() => {
    // Only fetch stats when we have a user
    if (!user) return;
    
    const fetchUserStats = async () => {
      try {
        setStatsLoading(true);
        const response = await fetch('/api/users/stats', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setStats({
            racesCompleted: data.races_completed || 0,
            averageWPM: data.avg_wpm || 0,
            averageAccuracy: data.avg_accuracy || 0
          });
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchUserStats();
  }, [user]); // Depend on user so stats are fetched when user is loaded

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
        {statsLoading ? (
          <div className="stats-loading">Loading stats...</div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

export default ProfilePage; 