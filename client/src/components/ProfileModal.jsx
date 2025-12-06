import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfileModal.css';
import defaultProfileImage from '../assets/icons/default-profile.svg';
import SegmentedToggle from './SegmentedToggle';

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
  const [selectedTitle, setSelectedTitle] = useState('');
  const [matchHistory, setMatchHistory] = useState([]);
  const [loadingMatchHistory, setLoadingMatchHistory] = useState(true);
  const [userTitles, setUserTitles] = useState([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [allTitles, setAllTitles] = useState([]);
  const [loadingAllTitles, setLoadingAllTitles] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState('overview'); // New state for stats tabs
  const [dropdownStyle, setDropdownStyle] = useState({}); // For fixed positioning of title dropdown

  const modalRef = useRef();
  const titleButtonRef = useRef(null); // Ref for title button positioning
  const titleDropdownRef = useRef(null); // Ref for title dropdown click-outside detection
  const typingInputRef = document.querySelector('.typing-input-container input');

  // Rank tiers based on races completed - Princeton-themed names
  const RANK_TIERS = [
    { min: 0, max: 10, tier: 'freshman', label: 'Freshman', color: '#95A5A6' },
    { min: 10, max: 50, tier: 'sophomore', label: 'Sophomore', color: '#3498DB' },
    { min: 50, max: 100, tier: 'junior', label: 'Junior', color: '#2ECC71' },
    { min: 100, max: 250, tier: 'senior', label: 'Senior', color: '#F58025' },
    { min: 250, max: 500, tier: 'gradstudent', label: 'Grad Student', color: '#9B59B6' },
    { min: 500, max: 1000, tier: 'supersenior', label: 'Super Senior', color: '#E74C3C' },
    { min: 1000, max: Infinity, tier: 'einstein', label: 'Einstein', color: '#FFD700' },
  ];

  // Determine user's rank tier based on races completed
  const getRankTier = (racesCompleted) => {
    const races = racesCompleted || 0;
    for (const tier of RANK_TIERS) {
      if (races >= tier.min && races < tier.max) {
        return tier;
      }
    }
    return RANK_TIERS[RANK_TIERS.length - 1]; // Return highest tier if somehow exceeded
  };

  // Calculate progress to next rank
  const getRankProgress = (racesCompleted) => {
    const races = racesCompleted || 0;
    const currentTier = getRankTier(races);
    const currentIndex = RANK_TIERS.findIndex(t => t.tier === currentTier.tier);
    const nextTier = currentIndex < RANK_TIERS.length - 1 ? RANK_TIERS[currentIndex + 1] : null;

    if (!nextTier) {
      // At max rank
      return {
        currentTier,
        nextTier: null,
        progress: 100,
        racesNeeded: 0,
        racesInTier: races - currentTier.min,
        tierRange: 0,
      };
    }

    const racesInTier = races - currentTier.min;
    const tierRange = nextTier.min - currentTier.min;
    const progress = (racesInTier / tierRange) * 100;
    const racesNeeded = nextTier.min - races;

    return {
      currentTier,
      nextTier,
      progress: Math.min(progress, 100),
      racesNeeded,
      racesInTier,
      tierRange,
    };
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
      // console.log('Avatar URL from user data:', user.avatar_url);
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

        // console.log('Full match history response from API:', data); // Log the raw data

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
          } else if (typeof temp1 === 'string') {
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

  const handleTitleClick = () => {
    setShowTitleDropdown(!showTitleDropdown);
  };

  const selectTitle = async (titleId) => {
    setShowTitleDropdown(false);
    try {
      // Update the local state immediately for a smooth transition
      setSelectedTitle(titleId);

      // Update the userTitles array to reflect the new equipped status
      setUserTitles(prevTitles =>
        prevTitles.map(title => ({
          ...title,
          is_equipped: String(title.id) === String(titleId)
        }))
      );

      // Send the API request after updating local state
      const response = await fetch('/api/profile/title', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleId }),
      });

      if (response.ok) {
        // Update the user context in the background without forcing a refresh
        const userData = await fetchUserProfile();
        if (userData) {
          setUser(prevUser => ({
            ...prevUser,
            selected_title_id: titleId,
            titles: userData.titles
          }));
        }
      } else {
        console.error('Failed to update title');
      }
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

  // Calculate dropdown position when it opens (fixes z-index stacking context issue)
  useEffect(() => {
    if (showTitleDropdown && titleButtonRef.current) {
      const rect = titleButtonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        minWidth: 280,
      });
    }
  }, [showTitleDropdown]);

  // Close title dropdown when clicking outside
  useEffect(() => {
    if (!showTitleDropdown) return;

    const handleClickOutside = (event) => {
      // Check if click is outside both the button and the dropdown
      const isOutsideButton = titleButtonRef.current && !titleButtonRef.current.contains(event.target);
      const isOutsideDropdown = titleDropdownRef.current && !titleDropdownRef.current.contains(event.target);

      if (isOutsideButton && isOutsideDropdown) {
        setShowTitleDropdown(false);
      }
    };

    // Add listener with a small delay to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTitleDropdown]);

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
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error('[handleAvatarClick] fileInputRef.current is null or undefined!');
    }
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
    if (netid && netid !== user?.netid) {
      return; // Safety check based on isOwnProfile logic
    }

    setUploadError('');
    setUploadSuccess('');
    setImageError(false);

    const file = e.target.files[0];
    if (!file) {
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Create a temp local URL for immediate display
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
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error JSON' }));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.user || !data.user.avatar_url) {
        console.error('[handleFileChange] Server response missing user or avatar_url:', data);
        throw new Error('Invalid response data from server.');
      }

      const newAvatarUrl = data.user.avatar_url;

      // Update user state with new avatar URL from server
      setUser(prevUser => {
        const updatedUser = { ...prevUser, avatar_url: newAvatarUrl };
        return updatedUser;
      });

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
      console.error('[handleFileChange] ERROR caught during avatar upload:', error);
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

  // Fetch all available titles
  useEffect(() => {
    if (!isOpen) return;
    const fetchAllTitles = async () => {
      try {
        setLoadingAllTitles(true);
        const response = await fetch('/api/titles', { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Failed to fetch titles');
        }
        const data = await response.json();
        setAllTitles(data || []);
      } catch (error) {
        console.error('Error fetching all titles:', error);
        setAllTitles([]);
      } finally {
        setLoadingAllTitles(false);
      }
    };

    fetchAllTitles();
  }, [isOpen]);

  // Get user rank info for visual styling (based on races completed)
  const userRank = getRankTier(parseNumericValue(displayUser?.races_completed));
  const rankProgress = getRankProgress(parseNumericValue(displayUser?.races_completed));

  // Calculate completion rate
  const completionRate = detailedStats && detailedStats.sessions_started > 0
    ? (detailedStats.sessions_completed / detailedStats.sessions_started * 100).toFixed(1)
    : 0;

  // Get equipped title for display
  const equippedTitle = userTitles.find(t => String(t.id) === String(selectedTitle));

  // Loading state check (consider both auth loading and profile loading)
  if ((isOwnProfile && loading) || (!isOwnProfile && loadingProfile)) {
    return (
      <div className="profile-overlay">
        <div className="profile-container profile-loading">
          <div className="profile-loader">
            <div className="loader-ring"></div>
            <span>Loading profile...</span>
          </div>
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
        {/* Close Button */}
        <button className="profile-close-btn" onClick={onClose} aria-label="Close profile">
          <span className="material-icons">close</span>
        </button>

        {/* ==================== HERO SECTION ==================== */}
        <div className={`profile-hero ${userRank.tier}`}>
          <div className="hero-background">
            <div className="hero-glow"></div>
            <div className="hero-particles"></div>
          </div>

          <div className="hero-content">
            {/* Avatar Section */}
            <div className="profile-avatar-section">
              <div className={`avatar-container ${userRank.tier}`}>
                <div className="avatar-ring"></div>
                <div className="avatar-wrapper">
                  {isOwnProfile ? (
                    <>
                      <input
                        type="image"
                        src={!imageError ? avatarUrl : defaultProfileImage}
                        alt="Upload profile picture"
                        aria-label="Upload profile picture"
                        title="Upload profile picture"
                        onClick={imageError && displayUser?.avatar_url ? openImageInNewTab : handleAvatarClick}
                        className={`avatar-image ${isUploading ? "uploading" : ""}`}
                        onError={handleImageError}
                      />
                      {/* Hover hint overlay for discoverability */}
                      <div className="avatar-edit-overlay" aria-hidden="true">
                        <span className="material-icons">photo_camera</span>
                        <span>Change Photo</span>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const target = e.target;
                          if (isOwnProfile) {
                            handleFileChange(e); // Call original handler
                          }
                          target.value = null;
                        }}
                        style={{ display: 'none' }}
                        accept="image/jpeg, image/png, image/gif, image/webp"
                      />
                      {isUploading && (
                        <div className="avatar-upload-progress">
                          <div className="upload-spinner"></div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Read-only image for other users
                    <img
                      src={!imageError ? avatarUrl : defaultProfileImage}
                      alt={`${displayUser?.netid || 'User'}'s Profile`}
                      className="avatar-image"
                      onClick={imageError && displayUser?.avatar_url ? openImageInNewTab : undefined}
                      onError={handleImageError}
                    />
                  )}
                </div>
                {/* Rank badge positioned below avatar */}
                <div className="rank-badge" style={{ backgroundColor: userRank.color }}>
                  {userRank.label}
                </div>
              </div>

              {/* Upload Messages */}
              {uploadError && <div className="upload-message error">{uploadError}</div>}
              {uploadSuccess && <div className="upload-message success">{uploadSuccess}</div>}
            </div>

            {/* User Identity */}
            <div className="user-identity">
              <h1 className="username">{displayUser?.netid || 'Guest'}</h1>

              {/* Title + Quick Stats Row */}
              <div className="title-stats-row">
                {/* Title Section - Conditional */}
                {isOwnProfile ? (
                  <div className="title-selector">
                    <button
                      ref={titleButtonRef}
                      className={`title-button ${showTitleDropdown ? 'active' : ''}`}
                      onClick={handleTitleClick}
                    >
                      <span className="title-text">
                        {equippedTitle?.name || 'Select a title'}
                      </span>
                      <span className={`dropdown-chevron ${showTitleDropdown ? 'open' : ''}`}>
                        <span className="material-icons">expand_more</span>
                      </span>
                    </button>

                    {showTitleDropdown && (
                      <div ref={titleDropdownRef} className="title-dropdown" style={dropdownStyle}>
                        <div className="dropdown-header">Choose Your Title</div>
                        {/* Add Deselect Option */}
                        <div
                          className="title-option deselect"
                          onClick={() => selectTitle(null)}
                        >
                          <span className="option-name">No Title</span>
                        </div>
                        {loadingAllTitles ? (
                          <div className="title-option loading">Loading titles...</div>
                        ) : allTitles && allTitles.length > 0 ? (
                          allTitles.map(title => {
                            const isUnlocked = userTitles.some(t => t.id === title.id);
                            const isSelected = String(title.id) === String(selectedTitle);
                            return (
                              <div
                                key={title.id}
                                className={`title-option ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`}
                                onClick={() => isUnlocked && selectTitle(title.id)}
                              >
                                <div className="option-content">
                                  <span className="option-name">{title.name}</span>
                                  <span className="option-desc">{title.description || 'No description available'}</span>
                                </div>
                                {!isUnlocked && (
                                  <span className="lock-icon material-icons">lock</span>
                                )}
                                {isSelected && isUnlocked && (
                                  <span className="check-icon material-icons">check</span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="title-option disabled">No titles available</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Read-only title display for others
                  <div className="title-display">
                    {loadingTitles ? (
                      <span className="title-loading">Loading...</span>
                    ) : displayUser && displayUser.selected_title_id && userTitles.find(t => String(t.id) === String(displayUser.selected_title_id)) ? (
                      // Display the equipped title if available
                      <span
                        className="equipped-title"
                        title={userTitles.find(t => String(t.id) === String(displayUser.selected_title_id))?.description}
                      >
                        {userTitles.find(t => String(t.id) === String(displayUser.selected_title_id))?.name}
                      </span>
                    ) : userTitles.find(t => t.is_equipped) ? (
                      // Alternatively check for is_equipped flag from the API response
                      <span
                        className="equipped-title"
                        title={userTitles.find(t => t.is_equipped)?.description}
                      >
                        {userTitles.find(t => t.is_equipped)?.name}
                      </span>
                    ) : (
                      // Display message if no title is equipped
                      <span className="no-title">No title equipped</span>
                    )}
                  </div>
                )}

                {/* Quick Stats in Hero */}
                <div className="hero-quick-stats">
                  <div className="quick-stat">
                    <span className="stat-value">{parseNumericValue(displayUser?.avg_wpm).toFixed(0)}</span>
                    <span className="stat-label">AVG WPM</span>
                  </div>
                  <div className="quick-stat-divider"></div>
                  <div className="quick-stat">
                    <span className="stat-value">{parseNumericValue(displayUser?.fastest_wpm).toFixed(0)}</span>
                    <span className="stat-label">BEST WPM</span>
                  </div>
                  <div className="quick-stat-divider"></div>
                  <div className="quick-stat">
                    <span className="stat-value">{parseNumericValue(displayUser?.avg_accuracy).toFixed(0)}%</span>
                    <span className="stat-label">ACCURACY</span>
                  </div>
                </div>
              </div>

              {/* Rank Progress Bar */}
              <div className="rank-progress-container">
                <div className="rank-progress-header">
                  <span className="current-rank" style={{ color: rankProgress.currentTier.color }}>
                    {rankProgress.currentTier.label}
                  </span>
                  {rankProgress.nextTier && (
                    <>
                      <span className="rank-arrow">→</span>
                      <span className="next-rank" style={{ color: rankProgress.nextTier.color }}>
                        {rankProgress.nextTier.label}
                      </span>
                    </>
                  )}
                </div>
                <div className="rank-progress-bar">
                  <div
                    className="rank-progress-fill"
                    style={{
                      width: `${rankProgress.progress}%`,
                      background: `linear-gradient(90deg, ${rankProgress.currentTier.color}, ${rankProgress.nextTier?.color || rankProgress.currentTier.color})`,
                    }}
                  ></div>
                </div>
                <div className="rank-progress-text">
                  {rankProgress.nextTier ? (
                    <span>{rankProgress.racesNeeded} races to <strong>{rankProgress.nextTier.label}</strong></span>
                  ) : (
                    <span>Max rank achieved!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== MAIN CONTENT GRID ==================== */}
        <div className="profile-main">
          {/* Left Column */}
          <div className="profile-column left">
            {/* Bio Section */}
            <section className="profile-section bio-section">
              <div className="section-header">
                <h3><span className="material-icons">edit_note</span> About</h3>
              </div>
              <div className="section-content">
                {isOwnProfile ? (
                  <div className="bio-editor">
                    <textarea
                      className="bio-textarea"
                      placeholder="Tell others about yourself..."
                      value={bio}
                      onChange={handleBioChange}
                      maxLength={500}
                    />
                    <div className="bio-footer">
                      <span className="char-count">{bio.length}/500</span>
                      <button
                        className="save-bio-btn"
                        onClick={saveBio}
                        disabled={isSavingBio}
                      >
                        {isSavingBio ? (
                          <>
                            <span className="btn-spinner"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <span className="material-icons">save</span>
                            Save
                          </>
                        )}
                      </button>
                    </div>
                    {bioMessage && (
                      <div className={`bio-message ${bioMessage.includes('Failed') ? 'error' : 'success'}`}>
                        {bioMessage}
                      </div>
                    )}
                  </div>
                ) : (
                  // Read-only bio for others
                  <div className="bio-display">
                    <p className={!displayUser?.bio ? 'empty-bio' : ''}>
                      {displayUser?.bio || 'This user hasn\'t written a bio yet.'}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Detailed Stats Section */}
            <section className="profile-section stats-section">
              <div className="section-header">
                <h3><span className="material-icons">insights</span> Statistics</h3>
                <SegmentedToggle
                  options={[
                    { value: 'overview', label: 'Overview' },
                    { value: 'detailed', label: 'Detailed' },
                  ]}
                  value={activeStatsTab}
                  onChange={setActiveStatsTab}
                  className="compact"
                  ariaLabel="Select stats view"
                />
              </div>
              <div className="section-content">
                {activeStatsTab === 'overview' ? (
                  <div className="stats-grid overview">
                    <div className="stat-tile primary">
                      <div className="stat-icon">
                        <span className="material-icons">speed</span>
                      </div>
                      <div className="stat-data">
                        <span className="stat-number">{parseNumericValue(displayUser?.avg_wpm).toFixed(1)}</span>
                        <span className="stat-unit">WPM</span>
                      </div>
                      <span className="stat-title">Average Speed</span>
                    </div>

                    <div className="stat-tile accent">
                      <div className="stat-icon">
                        <span className="material-icons">bolt</span>
                      </div>
                      <div className="stat-data">
                        <span className="stat-number">{parseNumericValue(displayUser?.fastest_wpm).toFixed(1)}</span>
                        <span className="stat-unit">WPM</span>
                      </div>
                      <span className="stat-title">Top Speed</span>
                    </div>

                    <div className="stat-tile success">
                      <div className="stat-icon">
                        <span className="material-icons">check_circle</span>
                      </div>
                      <div className="stat-data">
                        <span className="stat-number">{parseNumericValue(displayUser?.avg_accuracy).toFixed(1)}</span>
                        <span className="stat-unit">%</span>
                      </div>
                      <span className="stat-title">Accuracy</span>
                    </div>

                    <div className="stat-tile">
                      <div className="stat-icon">
                        <span className="material-icons">flag</span>
                      </div>
                      <div className="stat-data">
                        <span className="stat-number">{formatNumber(parseNumericValue(displayUser?.races_completed) || 0)}</span>
                      </div>
                      <span className="stat-title">Races Completed</span>
                    </div>
                  </div>
                ) : (
                  <div className="stats-grid detailed">
                    {loadingStats ? (
                      <div className="stats-loading">
                        <div className="loader-ring small"></div>
                        <span>Loading stats...</span>
                      </div>
                    ) : detailedStats ? (
                      <>
                        <div className="stat-row">
                          <span className="row-label">
                            <span className="material-icons">play_arrow</span>
                            Tests Started
                          </span>
                          <span className="row-value">{formatNumber(detailedStats.sessions_started)}</span>
                        </div>
                        <div className="stat-row">
                          <span className="row-label">
                            <span className="material-icons">done_all</span>
                            Tests Completed
                          </span>
                          <span className="row-value">{formatNumber(detailedStats.sessions_completed)}</span>
                        </div>
                        <div className="stat-row">
                          <span className="row-label">
                            <span className="material-icons">keyboard</span>
                            Words Typed
                          </span>
                          <span className="row-value">{formatNumber(detailedStats.words_typed)}</span>
                        </div>
                        <div className="stat-row highlight">
                          <span className="row-label">
                            <span className="material-icons">pie_chart</span>
                            Completion Rate
                          </span>
                          <span className="row-value">{completionRate}%</span>
                        </div>
                      </>
                    ) : (
                      <div className="no-stats">No detailed stats available</div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column - Match History */}
          <div className="profile-column right">
            <section className="profile-section history-section">
              <div className="section-header">
                <h3><span className="material-icons">history</span> Recent Matches</h3>
              </div>
              <div className="section-content">
                {loadingMatchHistory ? (
                  <div className="history-loading">
                    <div className="loader-ring small"></div>
                    <span>Loading history...</span>
                  </div>
                ) : matchHistory.length === 0 ? (
                  <div className="no-history">
                    <span className="material-icons">sports_esports</span>
                    <p>No matches yet. Start typing!</p>
                  </div>
                ) : (
                  <div className="match-timeline">
                    {matchHistory.map((match, index) => {
                      // Determine position class
                      let positionClass = '';
                      if (match.position === '1st') positionClass = 'gold';
                      else if (match.position === '2nd') positionClass = 'silver';
                      else if (match.position === '3rd') positionClass = 'bronze';

                      return (
                        <div key={index} className={`timeline-item ${positionClass}`}>
                          <div className="timeline-connector">
                            <div className="connector-dot"></div>
                            {index < matchHistory.length - 1 && <div className="connector-line"></div>}
                          </div>

                          <div className="match-card">
                            <div className="match-header">
                              <span className="match-type">{match.lobby_type}</span>
                              <span className="match-date">
                                {new Date(match.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>

                            <div className="match-body">
                              {/* Position Column (now first) */}
                              <div className={`match-position ${positionClass}`}>
                                <span className="position-value">{match.position || '-'}</span>
                              </div>

                              {/* Details Column (Type/Category + Stats) */}
                              <div className="match-metrics">
                                <div className="metric">
                                  <span className="metric-value wpm">{parseFloat(match.wpm).toFixed(0)}</span>
                                  <span className="metric-label">WPM</span>
                                </div>
                                <div className="metric">
                                  <span className="metric-value accuracy">{parseFloat(match.accuracy).toFixed(0)}%</span>
                                  <span className="metric-label">ACC</span>
                                </div>
                              </div>
                            </div>

                            {(match.source || match.category) && (
                              <div className="match-footer">
                                <span className="match-category">{match.source || match.category}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ProfileModal;
