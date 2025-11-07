/**
 * API Routes for TigerType
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../utils/auth');
const UserModel = require('../models/user');
const SnippetModel = require('../models/snippet');
const RaceModel = require('../models/race');
const { sendFeedbackEmails } = require('../utils/email');
const ChangelogModel = require('../models/changelog');
const profileRoutes = require('./profileRoutes'); // Import profile routes
const { pool } = require('../config/database');

const { CHANGELOG_PUBLISH_TOKEN } = process.env;

// Middleware to ensure API requests are authenticated
const requireAuth = (req, res, next) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Ensure userId is attached to the request object for subsequent handlers
  // auth middleware should populate req.user or req.session.userInfo.userId
  if (!req.user && req.session && req.session.userInfo && req.session.userInfo.userId) {
    req.user = { id: req.session.userInfo.userId, netid: req.session.userInfo.user };
  } else if (!req.user) {
    // Fallback attempt: Look up user by netid from session if req.user wasn't populated
    // This might happen if only CAS auth ran but not a DB lookup middleware
    console.warn('requireAuth: req.user not found, attempting lookup by netid');
    if (req.session && req.session.userInfo && req.session.userInfo.user) {
        const netid = req.session.userInfo.user;
        UserModel.findByNetid(netid).then(user => {
            if (user) {
                req.user = { id: user.id, netid: user.netid };
                // Attach user id to session as well for consistency
                if (!req.session.userInfo.userId) {
                    req.session.userInfo.userId = user.id;
                    req.session.save(); // Save session if modified
                }
                console.log('requireAuth: Found user by netid, attached to req.user');
                next();
            } else {
                console.error('requireAuth: User not found for netid:', netid);
                return res.status(401).json({ error: 'Authentication required (user not found)' });
            }
        }).catch(err => {
            console.error('requireAuth: Error looking up user by netid:', err);
            return res.status(500).json({ error: 'Server error during authentication' });
        });
        return; // Don't call next() here, will be called in the promise handler
    } else {
         console.error('requireAuth: Cannot proceed, no user info found in session.');
         return res.status(401).json({ error: 'Authentication required (no session info)' });
    }
  }
  
  // If req.user exists (either from original auth or fallback lookup), proceed
  next();
};
// --- Public Routes ---

// Get a random snippet for the landing page (unauthenticated)
router.get('/landing-snippet', async (req, res) => {
  try {
    const snippet = await SnippetModel.getRandom();
    if (!snippet) {
      // If no snippets exist at all, return a default message
      return res.json({ text: 'Welcome to TigerType! Start typing...' });
    }
    // Return only the text field
    res.json({ text: snippet.text });
  } catch (err) {
    console.error('Error fetching landing page snippet:', err);
    // Send a generic snippet text on error
    res.status(500).json({ text: 'Error loading snippet. Please try refreshing.' });
  }
});

// Public endpoint for timed leaderboard (no authentication required)
router.get('/public/leaderboard/timed', async (req, res) => {
  try {
    const { duration, period } = req.query;
    
    // Validate parameters
    const durationInt = parseInt(duration);
    if (![15, 30, 60, 120].includes(durationInt)) {
      return res.status(400).json({ error: 'Invalid duration. Must be 15, 30, 60, or 120.' });
    }
    
    if (!['daily', 'alltime'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be "daily" or "alltime".' });
    }
    
    const { getTimedLeaderboard } = require('../db');
    
    // Get leaderboard data
    const leaderboardData = await getTimedLeaderboard(durationInt, period);
    
    // Get avatars for each user
    const leaderboardWithAvatars = leaderboardData.map((entry) => ({
      ...entry,
      created_at: new Date(entry.created_at).toISOString(),
      avatar_url: entry.avatar_url || null
    }));
    
    res.json({ leaderboard: leaderboardWithAvatars });
  } catch (err) {
    console.error('Error fetching public timed leaderboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Authenticated Profile Routes ---
// All profile routes require authentication + are mounted under /profile
router.use('/profile', requireAuth, profileRoutes);

// --- Existing API Routes ---

// simple in-memory rate limiting for feedback (per IP)
const FEEDBACK_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const FEEDBACK_LIMIT_COUNT = 5; // max 5 submissions per window
const feedbackRate = new Map(); // ip -> { windowStart, count }

function isRateLimited(ip) {
  const now = Date.now();
  const entry = feedbackRate.get(ip);
  if (!entry || (now - entry.windowStart) > FEEDBACK_LIMIT_WINDOW_MS) {
    feedbackRate.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  if (entry.count > FEEDBACK_LIMIT_COUNT) return true;
  return false;
}

router.post('/feedback', async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '').toString();
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many feedback submissions. Please try again later.' });
    }
    const { category = 'feedback', message, contactInfo, pagePath } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({ error: 'Please include a description with at least 10 characters so we can help.' });
    }

    const sanitizedMessage = message.trim().slice(0, 4000);
    const sanitizedContact = typeof contactInfo === 'string' ? contactInfo.trim().slice(0, 255) : null;
    const sanitizedPagePath = typeof pagePath === 'string' ? pagePath.trim().slice(0, 255) : null;

    let netid = null;
    if (isAuthenticated(req)) {
      if (!req.user && req.session?.userInfo) {
        req.user = {
          id: req.session.userInfo.userId,
          netid: req.session.userInfo.user
        };
      }
      netid = req.user?.netid || req.session?.userInfo?.user || null;
    }

    const userAgent = req.get('user-agent')?.slice(0, 500) || null;

    // acknowledgement policy: only ack authenticated users at their Princeton address
    const ackTo = (isAuthenticated(req) && netid) ? `${netid}@princeton.edu` : null;

    // fire and forget to avoid hanging if mail provider is slow
    sendFeedbackEmails({
      category,
      message: sanitizedMessage,
      contactInfo: sanitizedContact,
      netid,
      userAgent,
      pagePath: sanitizedPagePath,
      createdAt: new Date(),
      ackTo
    }).catch(err => console.warn('feedback email send failed', err));

    return res.json({ success: true });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    return res.status(500).json({ error: 'Unable to submit feedback right now. Please try again later.' });
  }
});

/**
 * Mark tutorial as completed for the current user
 * PUT /api/user/tutorial-complete
 * Requires authentication
 * Returns: { id, has_completed_tutorial }
 */
router.put('/user/tutorial-complete', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing from request' });
    }
    const updated = await UserModel.markTutorialAsCompleted(userId);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error marking tutorial as completed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile info (Adjusted to use the new model fields)
router.get('/user/profile', requireAuth, async (req, res) => {
  try {
    // User object should already be populated by findOrCreate or findByNetid in auth steps
    // or the lookup in requireAuth middleware
    const netid = req.user.netid;

    // Fetch the full user details including bio and avatar
    // could potentially rely on the user object attached during auth/findOrCreate
    // but fetching fresh data seems more consistent
    const user = await UserModel.findByNetid(netid); 

    if (!user) {
      // This case should ideally be handled by auth steps
      return res.status(404).json({ error: 'User not found' });
    }

    const latestChangelog = await ChangelogModel.latest();
    const latestChangelogId = latestChangelog?.id ?? null;
    const hasUnseen = latestChangelogId && user.last_seen_changelog_id !== latestChangelogId;

    res.json({
      netid: user.netid,
      userId: user.id,
      created_at: user.created_at,
      last_login: user.last_login,
      bio: user.bio,
      avatar_url: user.avatar_url,
      races_completed: user.races_completed,
      avg_wpm: user.avg_wpm,
      avg_accuracy: user.avg_accuracy,
      fastest_wpm: user.fastest_wpm,
      has_completed_tutorial: user.has_completed_tutorial,
      last_seen_changelog_id: user.last_seen_changelog_id,
      last_seen_changelog_at: user.last_seen_changelog_at,
      latest_changelog_id: latestChangelogId,
      latest_changelog_title: latestChangelog?.title ?? null,
      latest_changelog_published_at: latestChangelog?.published_at ?? latestChangelog?.merged_at ?? null,
      has_unseen_changelog: Boolean(hasUnseen)
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/changelog/status', requireAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    const latest = await ChangelogModel.latest();
    const latestId = latest?.id ?? null;
    const lastSeenId = user?.last_seen_changelog_id ?? null;
    const hasUnseen = latestId && lastSeenId !== latestId;

    res.json({
      latest_id: latestId,
      latest_title: latest?.title ?? null,
      latest_published_at: latest?.published_at ?? latest?.merged_at ?? null,
      last_seen_id: lastSeenId,
      last_seen_at: user?.last_seen_changelog_at ?? null,
      has_unseen: Boolean(hasUnseen)
    });
  } catch (err) {
    console.error('Error fetching changelog status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/changelog/entries', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const entries = await ChangelogModel.list(limit, offset);
    const user = await UserModel.findById(req.user.id);
    const lastSeenId = user?.last_seen_changelog_id ?? null;

    res.json({
      entries,
      pagination: {
        limit,
        offset,
        count: entries.length
      },
      last_seen_id: lastSeenId
    });
  } catch (err) {
    console.error('Error fetching changelog entries:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/changelog/mark-read', requireAuth, async (req, res) => {
  try {
    const inputId = req.body?.changelogId;
    let targetId = Number.isInteger(inputId) ? inputId : parseInt(inputId, 10);

    if (!targetId) {
      const latest = await ChangelogModel.latest();
      if (!latest) {
        return res.status(200).json({ last_seen_changelog_id: null, last_seen_changelog_at: null });
      }
      targetId = latest.id;
    }

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ error: 'Invalid changelog id' });
    }

    const updated = await UserModel.markChangelogAsSeen(req.user.id, targetId);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      last_seen_changelog_id: updated.last_seen_changelog_id,
      last_seen_changelog_at: updated.last_seen_changelog_at
    });
  } catch (err) {
    console.error('Error marking changelog as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/changelog/publish', async (req, res) => {
  try {
    if (!CHANGELOG_PUBLISH_TOKEN) {
      console.error('Changelog publish token not configured');
      return res.status(503).json({ error: 'Changelog publishing not configured' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token || token !== CHANGELOG_PUBLISH_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body || {};
    const prNumber = parseInt(payload.pr_number, 10);

    if (!Number.isInteger(prNumber) || !payload.title) {
      return res.status(400).json({ error: 'Missing pull request number or title' });
    }

    const entry = await ChangelogModel.create({
      pr_number: prNumber,
      title: payload.title,
      body: payload.body || null,
      url: payload.url || null,
      merged_at: payload.merged_at || null,
      merged_by: payload.merged_by || null,
      labels: payload.labels || [],
      published_at: payload.published_at || null
    });

    res.status(201).json({ entry });
  } catch (err) {
    console.error('Error publishing changelog entry:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user stats
router.get('/user/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id; // User ID from requireAuth middleware
    
    const stats = await UserModel.getStats(userId);
    
    // Return the stats, or empty stats if none are found
    res.json(stats || {
      total_races: 0,
      avg_wpm: 0,
      max_wpm: 0,
      avg_accuracy: 0,
      unique_snippets: 0
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get detailed user stats including partial sessions
router.get('/user/detailed-stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id; // User ID from requireAuth middleware
    
    const detailedStats = await UserModel.getDetailedStats(userId);
    
    res.json(detailedStats);
  } catch (err) {
    console.error('Error fetching detailed user stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user recent results
router.get('/user/results', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 3;
    
    const results = await UserModel.getRecentResults(userId, limit);
    
    res.json(results || []);
  } catch (err) {
    console.error('Error fetching user results:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get random snippet with filters
router.get('/snippets/random', requireAuth, async (req, res) => {
  try {
    const { difficulty: difficultyStr, type, department } = req.query;
    const filters = {};

    // Map difficulty string to number
    if (difficultyStr && difficultyStr !== 'all') {
      const difficultyMap = { Easy: 1, Medium: 2, Hard: 3 };
      if (difficultyMap[difficultyStr]) {
        filters.difficulty = difficultyMap[difficultyStr];
      } else {
        console.warn(`Invalid difficulty string received: ${difficultyStr}`);
        // Optionally return a 400 error or ignore invalid difficulty
      }
    }

    // Map type to category
    if (type && type !== 'all') {
      // Handle 'course_reviews' mapping specifically
      filters.category = (type === 'course_reviews') ? 'course-reviews' : type;
    }

    // Add subject filter if type is course reviews and department is specified
    if (filters.category === 'course-reviews' && department && department !== 'all') {
      filters.subject = department; // Assuming department is the 3-letter code
    }

    console.log('Fetching snippet with filters:', filters);
    const snippet = await SnippetModel.getRandom(filters);

    if (!snippet) {
      // Log the filters that resulted in no snippet
      console.warn('No snippets found for the applied filters:', filters);
      // Return 404 or potentially a default/fallback snippet
      return res.status(404).json({ error: 'No snippets found matching the selected criteria.' });
    }

    res.json(snippet);
  } catch (err) {
    console.error('Error fetching random snippet with filters:', err);
    res.status(500).json({ error: 'Server error while fetching snippet' });
  }
});

// Get snippet categories
router.get('/snippets/categories', requireAuth, async (req, res) => {
  try {
    const categories = await SnippetModel.getCategories();
    
    res.json(categories);
  } catch (err) {
    console.error('Error fetching snippet categories:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get snippets by category
router.get('/snippets/category/:category', requireAuth, async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const snippets = await SnippetModel.getByCategory(category, limit);
    
    if (!snippets.length) {
      return res.status(404).json({ error: 'No snippets found in this category' });
    }
    
    res.json(snippets);
  } catch (err) {
    console.error('Error fetching snippets by category:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unique course review subjects (departments)
router.get('/snippets/course-subjects', requireAuth, async (req, res) => {
  try {
    const subjects = await SnippetModel.getCourseReviewSubjects();
    // Prepend 'all' for the frontend filter option
    res.json(['all', ...subjects]);
  } catch (err) {
    console.error('Error fetching course review subjects:', err);
    res.status(500).json({ error: 'Server error fetching subjects' });
  }
});

// Get available difficulty options based on selected type and department
router.get('/snippets/filters', requireAuth, async (req, res) => {
  try {
    const { type, department } = req.query;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Map type to category filter
    if (type && type !== 'all') {
      const category = type === 'course_reviews' ? 'course-reviews' : type;
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);

      // If course-reviews, include department filter
      if (category === 'course-reviews' && department && department !== 'all') {
        conditions.push(`SUBSTRING(course_name FROM 1 FOR 3) = $${paramIndex++}`);
        params.push(department);
      }
    }

    let query = 'SELECT DISTINCT difficulty FROM snippets';
    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await pool.query(query, params);
    // Map numeric difficulties to string labels
    const difficultyMapReverse = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
    const difficulties = result.rows
      .map(row => difficultyMapReverse[row.difficulty])
      .filter(Boolean);
    // Include 'all' by default
    const uniqueDifficulties = ['all', ...new Set(difficulties)];

    res.json({ difficulties: uniqueDifficulties });
  } catch (err) {
    console.error('Error fetching snippet filters:', err);
    res.status(500).json({ error: 'Server error fetching snippet filters' });
  }
});

// Get race results
router.get('/races/:code/results', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;
    
    const race = await RaceModel.findByCode(code);
    
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }
    
    const results = await RaceModel.getResults(race.id);
    
    res.json(results);
  } catch (err) {
    console.error('Error fetching race results:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    const dbHelpers = require('../utils/db-helpers');
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await dbHelpers.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get platform statistics (for landing page)
router.get('/stats', async (req, res) => {
  try {
    const { getTotalPlatformStats } = require('../db');
    const stats = await getTotalPlatformStats();
    
    // Format the numbers for display
    const formattedStats = {
      total_races: parseInt(stats.total_races).toLocaleString(),
      total_sessions_started: parseInt(stats.total_sessions_started).toLocaleString(),
      total_words_typed: stats.total_words_typed ?
        (parseInt(stats.total_words_typed)).toLocaleString() :
        '', // Fallback if word_count is not available
      avg_wpm: parseInt(stats.avg_wpm) || 68, // Fallback if no data
      active_users: parseInt(stats.active_users).toLocaleString() || 842 // Fallback if no data
    };
    
    res.json(formattedStats);
  } catch (err) {
    console.error('Error fetching platform statistics:', err);
    // Return fallback data if there's an error
    res.json({
      total_races: '10,482',
      total_sessions_started: '15,743',
      total_words_typed: '',
      avg_wpm: '68',
      active_users: '842'
    });
  }
})

// Get user badges
router.get('/user/badges', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const badges = await UserModel.getBadges(userId, true);
    res.json(badges);
    console.log('User badges fetched successfully');
  } catch (err) {
    console.error('Error fetching user badges:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user titles
router.get('/user/titles', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const titles = await UserModel.getTitles(userId);
    const profile = await UserModel.findById(userId);
    const selectedTitleId = profile.selected_title_id;
    const titlesWithEquip = titles.map(title => ({
      ...title,
      is_equipped: title.id === selectedTitleId
    }));
    res.json(titlesWithEquip);
    console.log('User titles fetched successfully');
  } catch (err) {
    console.error('Error fetching user titles:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get another user's titles by netid
router.get('/user/:netid/titles', requireAuth, async (req, res) => {
  try {
    const { netid } = req.params;
    const targetUser = await UserModel.findByNetid(netid);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    const titles = await UserModel.getTitles(targetUser.id);
    const selectedTitleId = targetUser.selected_title_id;
    const titlesWithEquip = titles.map(title => ({
      ...title,
      is_equipped: title.id === selectedTitleId
    }));
    res.json(titlesWithEquip);
  } catch (err) {
    console.error(`Error fetching titles for user ${req.params.netid}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get another user's basic profile by netid
router.get('/user/:netid/profile', requireAuth, async (req, res) => {
  try {
    const { netid } = req.params;
    const userToView = await UserModel.findByNetid(netid);
    if (!userToView) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      netid: userToView.netid,
      userId: userToView.id,
      bio: userToView.bio,
      avatar_url: userToView.avatar_url,
      races_completed: userToView.races_completed,
      avg_wpm: userToView.avg_wpm,
      avg_accuracy: userToView.avg_accuracy,
      fastest_wpm: userToView.fastest_wpm
    });
  } catch (err) {
    console.error('Error fetching user profile by netid:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get another user's detailed stats by netid
router.get('/user/:netid/detailed-stats', requireAuth, async (req, res) => {
  try {
    const { netid } = req.params;
    const userToView = await UserModel.findByNetid(netid);
    if (!userToView) {
      return res.status(404).json({ error: 'User not found' });
    }
    const detailedStats = await UserModel.getDetailedStats(userToView.id);
    res.json(detailedStats);
  } catch (err) {
    console.error('Error fetching detailed stats for user by netid:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get another user's recent results by netid
router.get('/user/:netid/results', requireAuth, async (req, res) => {
  try {
    const { netid } = req.params;
    const limit = parseInt(req.query.limit) || 3;
    const userToView = await UserModel.findByNetid(netid);
    if (!userToView) {
      return res.status(404).json({ error: 'User not found' });
    }
    const results = await UserModel.getRecentResults(userToView.id, limit);
    res.json(results || []);
  } catch (err) {
    console.error('Error fetching results for user by netid:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get another user's badges by netid
router.get('/user/:netid/badges', requireAuth, async (req, res) => {
  try {
    const { netid } = req.params;
    const userToView = await UserModel.findByNetid(netid);
    if (!userToView) {
      return res.status(404).json({ error: 'User not found' });
    }
    const badges = await UserModel.getBadges(userToView.id, false);
    res.json(badges);
  } catch (err) {
    console.error('Error fetching badges for user by netid:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get another user's titles by netid
router.get('/user/:netid/titles', requireAuth, async (req, res) => {
  try {
    const { netid } = req.params;
    const userToView = await UserModel.findByNetid(netid);
    if (!userToView) {
      return res.status(404).json({ error: 'User not found' });
    }
    const titles = await UserModel.getTitles(userToView.id);
    const selectedTitleId = userToView.selected_title_id;
    const titlesWithEquip = titles.map(title => ({
      ...title,
      is_equipped: title.id === selectedTitleId
    }));
    res.json(titlesWithEquip);
  } catch (err) {
    console.error('Error fetching titles for user by netid:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all available titles
router.get('/titles', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, key, name, description, criteria_type, criteria_value
      FROM titles
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all titles:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
