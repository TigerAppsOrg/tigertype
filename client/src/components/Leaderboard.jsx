import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import PropTypes from 'prop-types';
import axios from 'axios';
import './Leaderboard.css';
import defaultProfileImage from '../assets/icons/default-profile.svg';
import ProfileModal from './ProfileModal.jsx';

const DURATIONS = [15, 30, 60, 120];
const PERIODS = ['daily', 'alltime'];

// Helper function to format relative time
const formatRelativeTime = (timestamp) => {
  const nowUtc = Date.now(); // Current time in UTC milliseconds since epoch
  const createdAt = new Date(timestamp); // Parse the timestamp string
  const createdAtUtc = createdAt.getTime(); // Get timestamp time in UTC milliseconds since epoch
  
  // Calculate difference purely in UTC milliseconds
  const diffInMs = nowUtc - createdAtUtc;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? 'min' : 'mins'} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  
  // For timestamps older than 24 hours (shouldn't happen in daily view, but just in case)
  return createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

// Shallow comparison for arrays of title objects; assumes stable ordering
const titlesAreEqual = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (left.id !== right.id || left.name !== right.name || left.is_equipped !== right.is_equipped) {
      return false;
    }
  }
  return true;
};

function Leaderboard({ defaultDuration = 15, defaultPeriod = 'alltime', layoutMode = 'modal' }) {
  const { socket } = useSocket();
  // Destructure authenticated flag to check CAS login status
  const { user, authenticated } = useAuth();
  const [duration, setDuration] = useState(defaultDuration);
  const [period, setPeriod] = useState(defaultPeriod);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState(null);
  // Ref to manage delayed spinner timer
  const spinnerTimerRef = useRef(null);
  // State to track which user's profile to view
  const [selectedProfileNetid, setSelectedProfileNetid] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // State for storing fetched titles per leaderboard entry
  const [leaderboardTitlesMap, setLeaderboardTitlesMap] = useState({});
  // Ref to track which netids we've initiated fetches for (to avoid duplicate requests)
  const fetchingRef = useRef(new Set());

  // Track viewport to switch to compact controls on small screens
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 600px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', update) : mq.removeListener(update);
    };
  }, []);

  useEffect(() => {
    // Avoid flash of spinner: only show after a brief delay
    const spinnerDelayMs = 250;
    const timerRef = spinnerTimerRef.current;
    if (loading) {
      // Start a timer to show spinner if loading persists
      spinnerTimerRef.current = setTimeout(() => setShowSpinner(true), spinnerDelayMs);
    } else {
      // Loading finished quickly: hide spinner and clear any pending timers
      setShowSpinner(false);
      if (timerRef) clearTimeout(timerRef);
      spinnerTimerRef.current = null;
    }

    return () => {
      if (spinnerTimerRef.current) {
        clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
      }
    };
  }, [loading]);

  useEffect(() => {
    // Fetch from API directly if socket isn't available (user not logged in)
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      console.log(`Requesting leaderboard: duration=${duration}, period=${period}`);
      
      if (socket) {
        // Use socket if available (user is logged in)
        socket.emit('leaderboard:timed', { duration, period }, (response) => {
          setLoading(false);
          setHasLoadedOnce(true);
          if (response.error) {
            console.error('Error fetching leaderboard:', response.error);
            setError(response.error);
            setLeaderboard([]);
          } else {
            console.log('Leaderboard data received:', response.leaderboard);
            setLeaderboard(response.leaderboard || []);
          }
        });
      } else {
        // Direct API fetch for public leaderboard data (no auth required)
        try {
          const response = await fetch(`/api/public/leaderboard/timed?duration=${duration}&period=${period}`);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          // console.log('Leaderboard data received via public API:', data.leaderboard);
          setLeaderboard(data.leaderboard || []);
        } catch (err) {
          console.error('Error fetching leaderboard via public API:', err);
          setError('Unable to load leaderboard data. Please try again later.');
          setLeaderboard([]);
        } finally {
          setLoading(false);
          setHasLoadedOnce(true);
        }
      }
    };

    fetchLeaderboard();

    // OPTIONAL FOR LATER: Add listener for real-time updates if implemented on the server
    // const handleLeaderboardUpdate = (data) => { ... };
    // if (socket) {
    //   socket.on('leaderboard:timedUpdate', handleLeaderboardUpdate);
    //   return () => {
    //     socket.off('leaderboard:timedUpdate', handleLeaderboardUpdate);
    //   };
    // }

  }, [socket, duration, period]);

  // Fetch titles for each leaderboard entry
  useEffect(() => {
    if (!authenticated || leaderboard.length === 0) {
      // Clear titles map and fetching ref when not authenticated or leaderboard is empty
      setLeaderboardTitlesMap(prev => {
        if (Object.keys(prev).length === 0) return prev;
        return {};
      });
      fetchingRef.current.clear();
      return;
    }

    // Get current netids in leaderboard
    const currentNetids = new Set(leaderboard.map(entry => entry.netid));
    
    // Clean up titles and fetching ref for users no longer in leaderboard
    setLeaderboardTitlesMap(prev => {
      let didRemoveEntry = false;
      const cleanedEntries = Object.entries(prev).filter(([netid]) => {
        const shouldKeep = currentNetids.has(netid);
        if (!shouldKeep) {
          didRemoveEntry = true;
        }
        return shouldKeep;
      });

      // Clean up fetching ref regardless of whether map entries changed
      const filteredFetching = new Set();
      fetchingRef.current.forEach(netid => {
        if (currentNetids.has(netid)) {
          filteredFetching.add(netid);
        }
      });
      fetchingRef.current = filteredFetching;

      if (!didRemoveEntry) {
        return prev;
      }

      return Object.fromEntries(cleanedEntries);
    });

    leaderboard.forEach(entry => {
      const netid = entry.netid;
      
      // Sync context titles for current user
      if (netid === user?.netid && user?.titles) {
        setLeaderboardTitlesMap(prev => {
          const existingTitles = prev[netid];
          if (titlesAreEqual(existingTitles, user.titles)) return prev; // No change needed
          return { ...prev, [netid]: user.titles };
        });
      }
      // Fetch other users' titles if not already fetched or currently fetching
      if (netid !== user?.netid && !(netid in leaderboardTitlesMap) && !fetchingRef.current.has(netid)) {
        fetchingRef.current.add(netid);
        axios.get(`/api/user/${netid}/titles`)
          .then(res => {
            const nextTitles = res.data || [];
            setLeaderboardTitlesMap(prev => {
              const existingTitles = prev[netid];
              if (titlesAreEqual(existingTitles, nextTitles)) return prev;
              return { ...prev, [netid]: nextTitles };
            });
            fetchingRef.current.delete(netid);
          })
          .catch(err => {
            console.error(`Error fetching titles for ${netid}:`, err);
            setLeaderboardTitlesMap(prev => {
              const existingTitles = prev[netid];
              if (Array.isArray(existingTitles) && existingTitles.length === 0) return prev;
              return { ...prev, [netid]: [] };
            });
            fetchingRef.current.delete(netid);
          });
      }
    });
  }, [leaderboard, user, authenticated, leaderboardTitlesMap]);

  const handleAvatarClick = (_avatarUrl, netid) => {
    // Only proceed if user is authenticated via CAS
    if (!authenticated) return;
    setSelectedProfileNetid(netid);
    setShowProfileModal(true);
  };

  return (
    <>
      {layoutMode === 'landing' ? (
        <div className="leaderboard-landing-wrapper">
          {/* Combined Controls Area */}
          <div className="leaderboard-landing-controls-area">
             <h2>Leaderboards</h2>
             {isMobile ? (
               <div className="leaderboard-mobile-controls">
                 <label>
                   Period
                   <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Select period">
                     {PERIODS.map(p => (
                       <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                     ))}
                   </select>
                 </label>
                 <label>
                   Duration
                   <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} aria-label="Select duration">
                     {DURATIONS.map(d => (
                       <option key={d} value={d}>{d}s</option>
                     ))}
                   </select>
                 </label>
               </div>
             ) : (
               <>
                 {/* Period Controls (Daily/Alltime) - Separate Row */}
                 <div className="control-group period-controls horizontal">
                   {PERIODS.map(p => (
                     <button
                       key={p}
                       className={`control-button ${period === p ? 'active' : ''}`}
                       onClick={() => setPeriod(p)}
                     >
                       {p.charAt(0).toUpperCase() + p.slice(1)}
                     </button>
                   ))}
                 </div>
                 {/* Duration Controls (Times) */}
                 <div className="control-group duration-controls vertical">
                   {DURATIONS.map(d => (
                     <button
                       key={d}
                       className={`control-button ${duration === d ? 'active' : ''}`}
                       onClick={() => setDuration(d)}
                     >
                       {d}s
                     </button>
                   ))}
                 </div>
               </>
             )}
          </div>
          <div className="leaderboard-landing-list-area">
            {(hasLoadedOnce ? showSpinner : loading) && ( <div className="loading-indicator"><div className="spinner-border text-orange" role="status"><span className="visually-hidden">Loading...</span></div><p>Loading Leaderboard...</p></div> )}
            {error && <p className="error-message">Error: {error}</p>}
            {(hasLoadedOnce ? !showSpinner : !loading) && !error && (
              <div className="leaderboard-list">
                {leaderboard.length > 0 ? ( leaderboard.map((entry, index) => ( <div key={`${entry.user_id}-${entry.created_at}`} className={`leaderboard-item ${user && entry.netid === user.netid ? 'current-user' : ''}`}> <span className="leaderboard-rank">{index + 1}</span> <div className="leaderboard-player"> <div className="leaderboard-avatar" onClick={() => handleAvatarClick(entry.avatar_url, entry.netid)} title={`View ${entry.netid}\'s avatar`}> <img src={entry.avatar_url || defaultProfileImage} alt={`${entry.netid} avatar`} onError={(e) => { e.target.onerror = null; e.target.src=defaultProfileImage; }} /> </div> <div className="leaderboard-player-text"> <span className="leaderboard-netid">{entry.netid}</span> {authenticated && (() => { const titles = leaderboardTitlesMap[entry.netid]; const titleToShow = titles?.find(t => t.is_equipped); return titleToShow ? ( <div className="leaderboard-titles"> <span className="leaderboard-title-badge">{titleToShow.name}</span> </div> ) : null; })()} </div> </div> <div className="leaderboard-stats"> <span className="leaderboard-wpm">{parseFloat(entry.adjusted_wpm).toFixed(0)} WPM</span> <span className="leaderboard-accuracy">{parseFloat(entry.accuracy).toFixed(1)}%</span> <span className="leaderboard-date">{period === 'daily' ? formatRelativeTime(entry.created_at) : new Date(entry.created_at).toLocaleDateString()}</span> </div> </div> )) ) : ( <p className="no-results">No results found for this leaderboard.</p> )}
              </div>
            )}
            <p className="leaderboard-subtitle">Resets daily at 12:00 AM EST</p>
          </div>
        </div>
      ) : (
        <>
          <h2>Timed Leaderboards</h2>          
          <div className="leaderboard-controls">
            <div className="control-group duration-controls">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  className={`control-button ${duration === d ? 'active' : ''}`}
                  onClick={() => setDuration(d)}
                >
                  {d}s
                </button>
              ))}
            </div>
            <div className="control-group period-controls">
              {PERIODS.map(p => (
                <button
                  key={p}
                  className={`control-button ${period === p ? 'active' : ''}`}
                  onClick={() => setPeriod(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {(hasLoadedOnce ? showSpinner : loading) && (
            <div className="loading-indicator">
              <div className="spinner-border text-orange" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p>Loading Leaderboard...</p>
            </div>
          )}
          {error && <p className="error-message">Error: {error}</p>}

          {(hasLoadedOnce ? !showSpinner : !loading) && !error && (
            <div className="leaderboard-list">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                  <div
                    key={`${entry.user_id}-${entry.created_at}`}
                    className={`leaderboard-item ${user && entry.netid === user.netid ? 'current-user' : ''}`}
                  >
                    <span className="leaderboard-rank">{index + 1}</span>
                    <div className="leaderboard-player">
                      <div 
                        className={`leaderboard-avatar ${!authenticated ? 'disabled' : ''}`}
                        onClick={authenticated ? () => handleAvatarClick(entry.avatar_url, entry.netid) : undefined}
                        title={authenticated ? `View ${entry.netid}\'s profile` : 'Log in to view profiles'}
                      >
                        <img 
                          src={entry.avatar_url || defaultProfileImage} 
                          alt={`${entry.netid} avatar`} 
                          onError={(e) => { e.target.onerror = null; e.target.src=defaultProfileImage; }}
                        />
                      </div>
                      <div className="leaderboard-player-text">
                        <span className="leaderboard-netid">{entry.netid}</span>
                        {authenticated && (() => {
                          const titles = leaderboardTitlesMap[entry.netid];
                          // Only show title if user has one equipped - no fallback to first unlocked title
                          const titleToShow = titles?.find(t => t.is_equipped);
                          return titleToShow ? (
                            <div className="leaderboard-titles">
                              <span className="leaderboard-title-badge">
                                {titleToShow.name}
                              </span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="leaderboard-stats">
                      <span className="leaderboard-wpm">{parseFloat(entry.adjusted_wpm).toFixed(0)} WPM</span>
                      <span className="leaderboard-accuracy">{parseFloat(entry.accuracy).toFixed(1)}%</span>
                      <span className="leaderboard-date">
                        {period === 'daily' 
                          ? formatRelativeTime(entry.created_at)
                          : new Date(entry.created_at).toLocaleDateString()
                        }
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-results">No results found for this leaderboard.</p>
              )}
            </div>
          )}
          <p className="leaderboard-subtitle">Resets daily at 12:00 AM EST</p>
        </>
      )}

      {/* Profile Modal for viewing user profiles (only for authenticated users) */}
      {authenticated && showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          netid={selectedProfileNetid}
        />
      )}
    </>
  );
}

Leaderboard.propTypes = {
  defaultDuration: PropTypes.oneOf(DURATIONS),
  defaultPeriod: PropTypes.oneOf(PERIODS),
  layoutMode: PropTypes.oneOf(['modal', 'landing']),
};

export default Leaderboard; 
