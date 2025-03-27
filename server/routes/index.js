/**
 * Main route handler for TigerType
 */

const express = require('express');
const router = express.Router();
const apiRoutes = require('./api');
const { casAuth, isAuthenticated, logoutApp, logoutCAS } = require('../utils/auth');
const path = require('path');

// API routes
router.use('/api', apiRoutes);

// Auth routes
router.get('/auth/status', (req, res) => {
  res.json({
    authenticated: isAuthenticated(req),
    user: req.session.userInfo || null
  });
});

// Explicit login route - forces CAS authentication
router.get('/auth/login', casAuth, (req, res) => {
  res.redirect('/home');
});

// Regular logout route - just logs out from the app
router.get('/auth/logout', logoutApp);

// CAS logout route - logs out from CAS and then the app
router.get('/auth/logoutcas', logoutCAS);

// Main application route - requires CAS authentication
router.get('/', casAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Fallback route for single-page application
router.get('*', (req, res) => {
  // If authenticated, serve index.html for client-side routing
  // If not, redirect to CAS login
  if (isAuthenticated(req)) {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  } else {
    res.redirect('/');
  }
});

module.exports = router;