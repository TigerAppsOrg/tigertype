/**
 * API Routes for TigerType
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../utils/auth');
const UserModel = require('../models/user');
const SnippetModel = require('../models/snippet');
const RaceModel = require('../models/race');

// Middleware to ensure API requests are authenticated
const requireAuth = (req, res, next) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get user profile info
router.get('/user/profile', requireAuth, async (req, res) => {
  try {
    const netid = req.session.userInfo.user;
    const user = await UserModel.findByNetid(netid);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      netid,
      userId: user.id,
      created_at: user.created_at,
      last_login: user.last_login
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user stats
router.get('/user/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userInfo.userId;
    const stats = await UserModel.getStats(userId);
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user recent results
router.get('/user/results', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userInfo.userId;
    const limit = parseInt(req.query.limit) || 10;
    
    const results = await UserModel.getRecentResults(userId, limit);
    
    res.json(results);
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
    // This is a simple implementation, could be expanded with filters
    const db = require('../config/database');
    const result = await db.query(
      `SELECT u.netid, MAX(r.wpm) as max_wpm, AVG(r.wpm) as avg_wpm, 
       AVG(r.accuracy) as avg_accuracy, COUNT(*) as race_count
       FROM race_results r
       JOIN users u ON r.user_id = u.id
       GROUP BY u.netid
       ORDER BY max_wpm DESC
       LIMIT 10`
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;