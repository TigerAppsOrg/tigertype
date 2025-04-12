/**
 * API Routes for TigerType
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../utils/auth');
const UserModel = require('../models/user');
const SnippetModel = require('../models/snippet');
const RaceModel = require('../models/race');
const profileRoutes = require('./profileRoutes'); // Import profile routes

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

// --- Authenticated Profile Routes ---
// All profile routes require authentication + are mounted under /profile
router.use('/profile', requireAuth, profileRoutes);
router.use('/profile', requireAuth, profileRoutes); 

// --- Existing API Routes ---

// Get user profile info (Adjusted to use the new model fields)
router.get('/user/profile', requireAuth, async (req, res) => {
  try {
    // User object should already be populated by findOrCreate or findByNetid in auth steps
    // or the lookup in requireAuth middleware
    const userId = req.user.id; 
    const netid = req.user.netid;

    // Fetch the full user details including bio and avatar
    // could potentially rely on the user object attached during auth/findOrCreate
    // but fetching fresh data seems more consistent
    const user = await UserModel.findByNetid(netid); 

    if (!user) {
      // This case should ideally be handled by auth steps
      return res.status(404).json({ error: 'User not found' });
    }
    
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
      fastest_wpm: user.fastest_wpm
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
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

// Get user recent results
router.get('/user/results', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    const results = await UserModel.getRecentResults(userId, limit);
    
    res.json(results || []);
  } catch (err) {
    console.error('Error fetching user results:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get random snippet
router.get('/snippets/random', requireAuth, async (req, res) => {
  try {
    const difficulty = req.query.difficulty ? parseInt(req.query.difficulty) : null;
    const snippet = await SnippetModel.getRandom(difficulty);
    
    if (!snippet) {
      return res.status(404).json({ error: 'No snippets found' });
    }
    
    res.json(snippet);
  } catch (err) {
    console.error('Error fetching random snippet:', err);
    res.status(500).json({ error: 'Server error' });
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

module.exports = router;