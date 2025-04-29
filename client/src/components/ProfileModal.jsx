import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfileModal.css';
import defaultProfileImage from '../assets/icons/default-profile.svg';
import { createPortal } from 'react-dom';

function ProfileModal({ isOpen, onClose, netid }) {
  const { user, loading, setUser, fetchUserProfile } = useAuth();
  const [bio, setBio] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [bioMessage, setBioMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now()); // Timestamp for cache busting
  const [profileUser, setProfileUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const fileInputRef = useRef(null);
  const [detailedStats, setDetailedStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedTitle, setSelectedTitle] =useState('');
  const [matchHistory, setMatchHistory] = useState([]);
  const [loadingMatchHistory, setLoadingMatchHistory] = useState(true);
  const [userBadges, setUserBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [userTitles, setUserTitles] = useState([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [displayedBadges, setDisplayedBadges] = useState([]);
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);
  const [maxBadges] = useState(5); // Maximum number of badges that can be displayed
  
  const modalRef = useRef();
  const typingInputRef = document.querySelector('.typing-input-container input');

  const getBadgeEmoji = (key) => {
    switch (key) {
      case 'first_race': return '🏁';
      case 'novice': return '🥉';
      case 'intermediate': return '🥈';
      case 'advanced': return '🥇';
      case 'expert': return '👑';
      case 'fast': return '⚡';
      default: return '🏆';
    }
  };

  // Function to add cache busting parameter to image URL (this is so scuffed, even if it works pls refine ammaar)
  const getCacheBustedImageUrl = (url) => {
    if (!url) return defaultProfileImage;
    // Add or update the timestamp query parameter
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${timestamp}`;
  };

  // Handle closing modal on outside click or ESC key
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Close if clicked outside the modal content area
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
        setTimeout(() => {
          if (typingInputRef) {
            typingInputRef.focus();
          }
        }, 10);
      }
    };

    const handleEscapeKey = (event) => {
      // Close if Escape key is pressed
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // Add event listeners when the modal is open
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);
    } else {
      // Clean up listeners when modal is closed
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    }

    // Cleanup function to remove listeners when the component unmounts or isOpen changes
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]); // Re-run effect if isOpen or onClose changes

  // Fetch basic profile info when modal opens or netid changes
  useEffect(() => {
    if (!isOpen) return;
    const fetchProfile = async () => {
      setLoadingProfile(true);
      setProfileUser(null); // Clear previous user data
      const url = netid ? `/api/user/${netid}/profile` : '/api/user/profile';
      try {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        // If viewing another user, store in profileUser
        // If viewing self, data comes from `user` context, but store bio
        if (netid) {
          setProfileUser(data);
          if (data.bio) setBio(data.bio);
        } else if (user && user.bio) {
          // When viewing self, initialize bio from context if available
          setBio(user.bio);
        }
      } catch (err) {
        console.error('Error fetching profile user:', err);
      } finally {
        // If viewing self, loading depends on AuthContext, not this fetch
        if (netid) {
           setLoadingProfile(false);
        } else {
           // For self view, loading is finished when AuthContext `loading` is false
           // We set it true initially and rely on AuthContext state
           setLoadingProfile(loading); // Link to auth loading state
        }
      }
    };
    fetchProfile();
  }, [isOpen, netid, user, loading]); // Add user and loading dependencies

  // Fetch detailed stats
  useEffect(() => {
    if (!isOpen) return;
    // Determine whose stats to fetch
    const targetNetId = netid || user?.netid;
    if (!targetNetId) return; // Don't fetch if no user context and no netid

    const fetchDetailedStats = async () => {
      try {
        setLoadingStats(true);
        const url = `/api/user/${targetNetId}/detailed-stats`;
        const response = await fetch(url, { credentials: 'include' });

        if (!response.ok) {
          throw new Error('Failed to fetch detailed stats');
        }

        const data = await response.json();
        setDetailedStats(data);
      } catch (error) {
        console.error('Error fetching detailed stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDetailedStats();
  }, [isOpen, netid, user]); // Depend on isOpen, netid, and logged-in user

  useEffect(() => {
    // Initialize bio from user data when loaded (for self-view)
    if (!netid && user && user.bio) {
      setBio(user.bio);
    }
  }, [user, netid]); // Depend on user context and netid prop

  // Update timestamp when avatar URL changes (for self-view)
  useEffect(() => {
    if (!netid && user && user.avatar_url) {
      console.log('Avatar URL from user data:', user.avatar_url);
      setImageError(false);
      setTimestamp(Date.now());
    }
  }, [user?.avatar_url, netid]);

  // Fetch Match History
  useEffect(() => {
    if (!isOpen) return;
    const targetNetId = netid || user?.netid;
    if (!targetNetId) return;

    const fetchMatchHistory = async () => {
      try {
        setLoadingMatchHistory(true);
        const url = `/api/user/${targetNetId}/results?limit=10`;
        const response = await fetch(url, { credentials: 'include' });

        const data = await response.json();

        console.log('Full match history response from API:', data); // Log the raw data

        for (let i of data) {
          let temp = String(i['lobby_type']);
          let cap = temp.slice(0, 1);
          cap = cap.toUpperCase();
          temp = cap + temp.slice(1);
          i['lobby_type'] = temp; // Capitalize the first letter of lobby_type

          if (i['lobby_type'] === "Public" || i['lobby_type'] === "Private") {
            i['lobby_type'] = i['lobby_type'] + ' Lobby';
          }

          let temp1 = i['position'];
          if (temp1 === '1') {
            temp1 += 'st';
          } else if (temp1 === '2') {
            temp1 += 'nd';
          }
          else if (temp1 === '3') {
            temp1 += 'rd';
          } else if (typeof temp1 === 'string'){
            temp1 += 'th';
          }
          i['position'] = temp1; // Add suffix to position
        }
        // console.log('Match history data:', data);

        // Slice the data to get only the top 10 most recent matches
        const recentMatches = data.slice(0, 10);

        setMatchHistory(recentMatches)

      } catch (error) {
        console.error('Error fetching match history:', error);
        setMatchHistory([]); // Set to empty array on error
      } finally {
        setLoadingMatchHistory(false);
      }
    };

    fetchMatchHistory();
  }, [isOpen, netid, user, timestamp]);

  // Fetch Badges
  useEffect(() => {
    if (!isOpen) return;
    const targetNetId = netid || user?.netid;
    if (!targetNetId) return;

    const fetchUserBadges = async () => {
      try {
        setLoadingBadges(true);
        const url = `/api/user/${targetNetId}/badges`;
        const response = await fetch(url, { credentials: 'include' });

        const data = await response.json();
        // console.log('User badges:', data);
        setUserBadges(data || []);
      }
      catch (error) {
        console.error('Error fetching user badges:', error);
        setUserBadges([]);
      }
      finally {
        setLoadingBadges(false);
      }
    }

    fetchUserBadges();
  }, [isOpen, netid, user]);

  const toggleBadgeSelection = (badge) => {
    const isCurrentlySelected = displayedBadges.some(b => b.id === badge.id);
    
    if (isCurrentlySelected) {
      // Remove badge from selection
      setDisplayedBadges(displayedBadges.filter(b => b.id !== badge.id));
    } else if (displayedBadges.length < maxBadges) {
      // Add badge to selection if under max limit
      setDisplayedBadges([...displayedBadges, badge]);
    }
  };

  useEffect(() => {
    if (isOpen && userBadges?.length > 0) {
      const savedBadgeIds = JSON.parse(localStorage.getItem('displayedBadgeIds') || '[]');
    const badgeDisplayOrder = JSON.parse(localStorage.getItem('badgeDisplayOrder') || '[]');
    
    if (badgeDisplayOrder.length > 0) {
      // Use the stored order to display badges
      const orderedBadges = [];
      
      // First add badges in their saved order
      badgeDisplayOrder.forEach(item => {
        const badge = userBadges.find(b => b.id.toString() === item.id);
        if (badge) {
          orderedBadges.push(badge);
        }
      });
      
      // Set the ordered badges
      setDisplayedBadges(orderedBadges.slice(0, maxBadges));
    } else {
      // Fall back to the old method if no order is saved
      const badgesToDisplay = userBadges.filter(badge => 
        savedBadgeIds.includes(badge.id.toString())
      );
      
      setDisplayedBadges(badgesToDisplay.slice(0, maxBadges));
    }
  }
}, [isOpen, userBadges, maxBadges]);

  const saveBadgeSelections = () => {
    const badgeIds = displayedBadges.map(badge => badge.id.toString());
    const orderedBadges = displayedBadges.map((badge, index) => ({
      id: badge.id.toString(),
      order: index
    }));
    
    localStorage.setItem('displayedBadgeIds', JSON.stringify(badgeIds));
    localStorage.setItem('badgeDisplayOrder', JSON.stringify(orderedBadges));
    setShowBadgeSelector(false);
  };
  
  const handleTitleClick = () => {
    setShowTitleDropdown(!showTitleDropdown);
  };

  const selectTitle = async (titleId) => {
    setShowTitleDropdown(false);
    try {
      await fetch('/api/profile/title', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleId }),
      });
      // Refresh context and modal titles to reflect the new selection
      await fetchUserProfile();
      setSelectedTitle(titleId);
    } catch (error) {
      console.error('Error updating selected title:', error);
    }
  };

  // Fetch Titles
  useEffect(() => {
    if (!isOpen) return;
    const targetNetId = netid || user?.netid;
    if (!targetNetId) return;

    const fetchUserTitles = async () => {
      try {
        setLoadingTitles(true);
        const url = `/api/user/${targetNetId}/titles`;
        const response = await fetch(url, { credentials: 'include' });

        const data = await response.json();
        // console.log('User titles:', data);
        setUserTitles(data || []);
      }
      catch (error) {
        console.error('Error fetching user titles:', error);
        setUserTitles([]);
      }
      finally {
        setLoadingTitles(false);
      }
    }

    fetchUserTitles();
  }, [isOpen, netid, user]);

  useEffect(() => {
    if (isOpen && userTitles?.length > 0) {
      const equipped = userTitles.find(title => title.is_equipped);
      setSelectedTitle(equipped ? equipped.id : '');
    }
  }, [isOpen, userTitles]);

  // Parse numeric values to check if ints
  const parseNumericValue = (value) => {
    if (value === null || value === undefined) return 0;
    return typeof value === 'string' ? parseFloat(value) : value;
  };

  // Format large numbers with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleBioChange = (e) => {
    setBio(e.target.value);
  };

  const saveBio = async () => {
    setIsSavingBio(true);
    setBioMessage('');

    // Save bio that's being sent to compare later
    const bioToSave = bio;

    try {
      const response = await fetch('/api/profile/bio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: bioToSave }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Bio save response:', data);

      // Update the user context with new bio
      setUser(prevUser => ({ ...prevUser, bio: data.user.bio }));

      // Update window.user for socket access
      if (window.user) {
        window.user.bio = data.user.bio;
      }

      // Update local bio state to keep UI consistent
      setBio(data.user.bio);

      setBioMessage('Bio saved successfully!');

      // Clear message after 2.5 seconds
      setTimeout(() => {
        setBioMessage('');
      }, 2500);
    } catch (error) {
      console.error('Error saving bio:', error);
      setBioMessage('Failed to save bio. Please try again.');
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleImageError = () => {
    const urlWithError = netid ? profileUser?.avatar_url : user?.avatar_url;
    console.error('Image failed to load:', urlWithError);
    setImageError(true);
    // Add a message to the user
    if (urlWithError) {
      setUploadError('Image loaded successfully but cannot be displayed. You can view it by clicking the avatar.');
    }
  };

  const openImageInNewTab = () => {
    const urlToOpen = netid ? profileUser?.avatar_url : user?.avatar_url;
    if (urlToOpen && imageError) {
      window.open(urlToOpen, '_blank');
    } else {
      handleAvatarClick(); // Or do nothing if not own profile?
    }
  };

  const handleFileChange = async (e) => {
    if (netid) return; // Should not happen if button is hidden, but safety check
    setUploadError('');
    setUploadSuccess('');
    setImageError(false);
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 5MB.');
      return;
    }

    // Validate file type
    // do we keep gifs? not sure
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Create a temp local URL for immediate display
    // i cant get a more efficient way that works lol
    // this is stupid inefficient but someone smarter than me is needed
    const localImageUrl = URL.createObjectURL(file);
    // Update avatar immediately with local file for better UX
    setUser(prevUser => ({ ...prevUser, avatar_url: localImageUrl }));
    // Force timestamp update to show new image immediately
    setTimestamp(Date.now());

    // Create FormData object to send the file
    const formData = new FormData();
    formData.append('avatar', file);

    setIsUploading(true);

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Avatar upload response:', data);

      // Update user state with new avatar URL from server
      setUser(prevUser => ({ ...prevUser, avatar_url: data.user.avatar_url }));

      // Make sure window.user is updated
      if (window.user) {
        window.user.avatar_url = data.user.avatar_url;
      }

      // Force immediate update of the avatar by updating timestamp
      setTimestamp(Date.now());

      // Revoke the temporary local URL to free up memory
      URL.revokeObjectURL(localImageUrl);

      // Show success message
      setUploadSuccess('Avatar uploaded successfully!');

      // Clear success message after 2.5 sec
      setTimeout(() => {
        setUploadSuccess('');
      }, 2500);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      setUploadError(error.message || 'Failed to upload avatar. Please try again.');

      // If upload fails, revert to the previous avatar
      if (user && user.avatar_url !== localImageUrl) {
        setUser(prevUser => ({ ...prevUser, avatar_url: user.avatar_url }));
      }

      // Revoke the temp URL
      URL.revokeObjectURL(localImageUrl);
    } finally {
      setIsUploading(false);
    }
  };

  // Determine if viewing own profile
  const isOwnProfile = !netid || (user && netid === user.netid);
  // Determine which user object to use for display
  const displayUser = isOwnProfile ? user : profileUser;

  // Recalculate avatarUrl based on displayUser
  const avatarUrl = getCacheBustedImageUrl(displayUser?.avatar_url);

  // Loading state check (consider both auth loading and profile loading)
  if ((isOwnProfile && loading) || (!isOwnProfile && loadingProfile)) {
     return (
        <div className="profile-overlay">
           <div className="profile-container loading-container">
              Loading profile...
           </div>
        </div>
     );
  }

  // If modal is closed, render nothing (after all hooks)
  if (!isOpen) {
    return null;
  }

  return (
    <div className="profile-overlay">
      <div className="profile-container" ref={modalRef}>

        <div className="back-button-container">
          <button className="back-button-profile" onClick={onClose}>
          <span className="material-icons">arrow_back</span> Back
          </button>
          <div className='profile-title'>
            <h2>Profile</h2>
          </div>
        </div>

        <div className="profile-header">
          <div className='profile-components'>
            <div className="profile-header-info">
              <div className="profile-page-info">
                <div className="profile-page-image">
                  {isOwnProfile ? (
                    <>
                      <input
                        type="image"
                        src={!imageError ? avatarUrl : defaultProfileImage}
                        alt="Profile"
                        onClick={imageError && displayUser?.avatar_url ? openImageInNewTab : handleAvatarClick}
                        className={isUploading ? "uploading" : ""}
                        onError={handleImageError}
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={isOwnProfile ? handleFileChange : undefined}
                        style={{ display: 'none' }}
                        accept="image/jpeg, image/png, image/gif, image/webp"
                      />
                      {isUploading && <div className="upload-overlay">Uploading...</div>}
                      {uploadError && <div className="profile-error-message">{uploadError}</div>}
                      {uploadSuccess && <div className="success-message">{uploadSuccess}</div>}
                    </>
                  ) : (
                    // Read-only image for other users
                    <img
                      src={!imageError ? avatarUrl : defaultProfileImage}
                      alt={`${displayUser?.netid || 'User'}'s Profile`}
                      className="static-avatar" // Add different class if needed
                      onClick={imageError && displayUser?.avatar_url ? openImageInNewTab : undefined}
                      onError={handleImageError}
                    />
                  )}
                </div>

                <div className="selectable-info">
                  <div className="username-info">
                    <h2>{displayUser?.netid || 'Guest'}</h2>
                  </div>

                  {/* Title Section - Conditional */} 
                  {isOwnProfile ? (
                    <div className="title-select">
                      <div
                        className="selected-title"
                        onClick={handleTitleClick}
                      >
                        {selectedTitle ?
                          userTitles.find(t => String(t.id) === String(selectedTitle))?.name || 'Select a title...'
                          : 'Select a title...'}
                        <span className="dropdown-arrow">▼</span>
                      </div>
                      {showTitleDropdown && (
                        <div className="title-dropdown">
                          {/* Add Deselect Option */}
                          <div
                            className="dropdown-option deselect-option"
                            onClick={() => selectTitle(null)} // Pass null to deselect
                          >
                            Deselect Title
                          </div>
                          {loadingTitles ? (
                            <div className="dropdown-option loading">Loading titles...</div>
                          ) : userTitles && userTitles.length > 0 ? (
                            userTitles.map(title => (
                              <div
                                key={title.id}
                                className="dropdown-option"
                                onClick={() => selectTitle(title.id)}
                              >
                                 {title.name}
                                <div className='title-description'>
                                  - {title.description || 'No description available'}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="dropdown-option disabled">No titles available</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Read-only title display for others
                    <div className="title-display static-title">
                       {loadingTitles ? (
                         <span>Loading title...</span>
                       ) : displayUser && displayUser.selected_title_id && userTitles.find(t => t.id === displayUser.selected_title_id)?.name ? (
                         // Display the equipped title if available
                         <span className="displayed-title-name">{userTitles.find(t => t.id === displayUser.selected_title_id).name}</span>
                       ) : (
                         // Display message if no title is equipped
                         <span className="no-title-display">User has no title selected</span>
                       )}
                     </div>
                  )}

                  <div className="user-badges">
                    <h3>Badges</h3>

                    <div className="badge-display">
                      {/* Show selected badges for self, all badges for others */} 
                      {(isOwnProfile ? displayedBadges : userBadges).map((badge, index) => (
                        <div
                          key={`selected-${badge.id}`}
                          className="badge-item selected"
                          // Only allow opening selector if own profile
                          onClick={isOwnProfile ? () => setShowBadgeSelector(true) : undefined}
                          style={!isOwnProfile ? { cursor: 'default' } : {}}
                        >
                          {badge.icon_url ? (
                            <img src={badge.icon_url} alt={badge.name} className="badge-image" />
                          ) : (
                            <span className="badge-emoji">{getBadgeEmoji(badge.key)}</span>
                          )}
                          <span className="badge-name">{badge.name}</span>
                        </div>
                      ))}

                      {/* Display message if viewing other profile with no badges */}
                      {!isOwnProfile && userBadges.length === 0 && !loadingBadges && (
                        <div className="no-badges-display">No badges earned yet.</div>
                      )}

                      {/* Only show placeholder add badges if own profile */}
                      {isOwnProfile && Array.from({ length: maxBadges - displayedBadges.length }, (_, i) => (
                          <div
                            key={`empty-${i}`}
                            className="badge-item placeholder"
                            onClick={() => setShowBadgeSelector(true)}
                          >
                            <span className="badge-plus">+</span>
                          </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className='biography'>
                {isOwnProfile ? (
                  <>
                    <textarea
                      className="biography-input"
                      placeholder='Write a little about yourself!'
                      value={bio}
                      onChange={isOwnProfile ? handleBioChange : undefined}
                      readOnly={!isOwnProfile}
                    ></textarea>
                    <div className="bio-controls">
                      <button
                        className="save-bio-btn"
                        onClick={saveBio}
                        disabled={isSavingBio}
                      >
                        {isSavingBio ? 'Saving...' : 'Save Bio'}
                      </button>
                      {bioMessage && <span className={bioMessage.includes('Failed') ? 'bio-error' : 'bio-success'}>{bioMessage}</span>}
                    </div>
                  </>
                ) : (
                  // Read-only bio for others
                  <div className="read-only-bio-container">
                     <p className="bio-text">{displayUser?.bio || ''}</p>
                  </div>
                )}
              </div>
            </div>

            <div className='match-history'>
              <h2>Match History</h2>
              
              {loadingMatchHistory ? (
                <div className="loading-message">Loading match history...</div>
              ) : matchHistory.length === 0 ? (
                <div className="no-matches">No recent race history available.</div>
              ) : (
                <div className="match-history-list">
                  {matchHistory.map((match, index) => {
                    // Determine position class
                    let positionClass = '';
                    if (match.position === '1st') positionClass = 'first-place';
                    else if (match.position === '2nd') positionClass = 'second-place';
                    else if (match.position === '3rd') positionClass = 'third-place';

                    return (
                      <div key={index} className="match-history-card">
                        <div className="match-date">
                          {new Date(match.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="match-details">
                          {/* Position Column (now first) */}
                          <div className={`match-position ${positionClass}`}>
                            <div className="position-number">{match.position || '-'}</div>
                            <div className="match-position-label">Position</div>
                          </div>

                          {/* Details Column (Type/Category + Stats) */}
                          <div className="match-info-details">
                            <div className="match-type">
                              <div className='match-lobby-type'>
                                {match.lobby_type}
                              </div>
                              <div className='match-category'>
                                {match.source || match.category || "Race"}
                              </div>
                            </div>

                            <div className="match-stats">
                              <span><i className="bi bi-speedometer"></i> {parseFloat(match.wpm).toFixed(0)} WPM</span>
                              <span><i className="bi bi-check-circle"></i> {parseFloat(match.accuracy).toFixed(0)}% Acc</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>


        {/* We may want to make stats be dynamic (i.e. golden color) if they're exceptional */}
        <div className="profile-stats">
          {/* Adjust title based on viewed user */}
          <h2>{isOwnProfile ? 'Your' : `${displayUser?.netid || 'User'}'s`} Stats</h2>
          {!displayUser ? (
            <div className="stats-loading">No stats available</div>
          ) : (
            <div className="stats-grid primary-stats">
              <div className="stat-card">
                <h3><i className="bi bi-bar-chart-line"></i> Races Completed</h3>
                <p>{parseNumericValue(displayUser.races_completed) || 0}</p>
              </div>
              <div className="stat-card">
                <h3><i className="bi bi-speedometer"></i> Average WPM</h3>
                <p>{parseNumericValue(displayUser.avg_wpm).toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <h3><i className="bi bi-check-circle"></i> Average Accuracy</h3>
                <p>{parseNumericValue(displayUser.avg_accuracy).toFixed(2)}%</p>
              </div>
              <div className="stat-card">
                <h3><i className="bi bi-lightning-fill"></i> Fastest Speed</h3>
                <p>{parseNumericValue(displayUser.fastest_wpm).toFixed(2)} WPM</p>
              </div>
            </div>
          )}

          {loadingStats ? (
            <div className="stats-loading">Loading detailed stats...</div>
          ) : !detailedStats && (isOwnProfile || profileUser) ? (
            <div className="stats-loading">No detailed stats available</div>
          ) : detailedStats ? (
            <div className="stats-grid">
              <div className="stat-card">
                <h3><i className="bi bi-pencil-square"></i> Total Tests Started</h3>
                <p>{formatNumber(detailedStats.sessions_started)}</p>
              </div>
              <div className="stat-card">
                <h3><i className="bi bi-check2-square"></i> Sessions Completed</h3>
                <p>{formatNumber(detailedStats.sessions_completed)}</p>
              </div>
              <div className="stat-card">
                <h3><i className="bi bi-keyboard"></i> Total Words Typed</h3>
                <p>{formatNumber(detailedStats.words_typed)}</p>
              </div>
              <div className="stat-card">
                <h3><i className="bi bi-pie-chart"></i> Completion Rate</h3>
                <p>{detailedStats.sessions_started > 0
                  ? (detailedStats.sessions_completed / detailedStats.sessions_started * 100).toFixed(1)
                  : 0}%</p>
              </div>
            </div>
          ) : null}    
        </div>
      </div>

      {showBadgeSelector && (
                      <div className="badge-selector-overlay"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div className="badge-selector">
                          <h4>Select Badges to Display</h4>
                          <div className="badge-grid">
                            {loadingBadges ? (
                              <div className="badge-loading">Loading badges...</div>
                            ) : userBadges.length > 0 ? (
                              userBadges.map(badge => (
                                <div
                                  key={badge.id}
                                  className={`badge-selection-item ${displayedBadges.some(b => b.id === badge.id) ? 'selected' : ''}`}
                                  onClick={() => toggleBadgeSelection(badge)}
                                >
                                  {badge.icon_url ? (
                                    <img src={badge.icon_url} alt={badge.name} className="badge-image" />
                                  ) : (
                                    <span className="badge-emoji">{getBadgeEmoji(badge.key)}</span>
                                  )}
                                  <div className="badge-details">
                                    <span className="badge-modal-name">{badge.name}</span>
                                    <span className="badge-modal-description">{badge.description}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="no-badges">No badges earned yet. Complete races to earn badges!</div>
                            )}
                          </div>
                          <div className="badge-selector-actions">
                            <button className="badge-cancel" onClick={() => setShowBadgeSelector(false)}>Cancel</button>
                            <button className="badge-save" onClick={saveBadgeSelections}>Save Changes</button>
                          </div>
                        </div>
                      </div>
                    )}
    </div>
  );
}

export default ProfileModal;