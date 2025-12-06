import React, { useState, useEffect } from 'react';
import './StatsShowcase.css';

/**
 * StatsShowcase component displays key statistics about the TigerType platform
 * in an attractive, visual format.
 */
function StatsShowcase() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define the stats structure with Bootstrap icons
  const statsConfig = [
    {
      id: 'races',
      label: 'Races Completed',
      iconClass: 'bi bi-flag-fill',
      dataKey: 'total_races'
    },
    {
      id: 'sessions',
      label: 'Tests Started',
      iconClass: 'bi bi-play-circle-fill',
      dataKey: 'total_sessions_started'
    },
    {
      id: 'words',
      label: 'Words Typed',
      iconClass: 'bi bi-fonts',
      dataKey: 'total_words_typed'
    },
    {
      id: 'wpm',
      label: 'Avg. WPM',
      iconClass: 'bi bi-lightning-fill',
      dataKey: 'avg_wpm'
    },
    {
      id: 'users',
      label: 'Active Tigers',
      iconClass: 'bi bi-people-fill',
      dataKey: 'active_users'
    }
  ];

  // Fetch statistics from the API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stats');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Map the API data to our stats structure
        const formattedStats = statsConfig.map(config => ({
          ...config,
          value: data[config.dataKey] || '0'
        }));
        
        setStats(formattedStats);
        setError(null);
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Failed to load statistics');
        
        // Use fallback data if there's an error
        const fallbackStats = statsConfig.map(config => {
          let fallbackValue = '0';
          if (config.id === 'races') fallbackValue = '10,482';
          if (config.id === 'sessions') fallbackValue = '15,743';
          if (config.id === 'words') fallbackValue = '10,141';
          if (config.id === 'wpm') fallbackValue = '117';
          if (config.id === 'users') fallbackValue = '312';
          
          return {
            ...config,
            value: fallbackValue
          };
        });
        
        setStats(fallbackStats);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="stats-showcase">
      <h2 className="stats-heading">Statistics</h2>
      <div className="stats-container">
        {loading ? (
          <div className="stats-loading">Loading statistics...</div>
        ) : error ? (
          <div className="stats-error">{error}</div>
        ) : (
          stats.map(stat => (
            <div key={stat.id} className="stat-card">
              <div className="stat-icon">
                <i className={stat.iconClass}></i>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default StatsShowcase;