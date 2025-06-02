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

// Determine the correct path for index.html based on environment
const getIndexPath = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use the client/dist directory (consistent with server.js)
    return path.join(__dirname, '../../client/dist/index.html');
  } else {
    // In development, use the public directory
    return path.join(__dirname, '../../public/index.html');
  }
};

// Main application route - requires CAS authentication
router.get('/', casAuth, (req, res) => {
  const indexPath = getIndexPath();
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`Error sending file ${indexPath}:`, err);
      res.status(500).send('Error serving application.');
    }
  });
});

// Specific lobby route with server-side validation
router.get('/lobby/:lobbyCode', casAuth, (req, res) => {
  const rawCode = req.params.lobbyCode || '';
  const sanitized = rawCode.toString().trim().toUpperCase();

  // Allow only alphanumeric codes up to 20 characters
  const codeRegex = /^[A-Z0-9]{1,20}$/;
  if (!codeRegex.test(sanitized)) {
    return res.status(400).send('Invalid lobby code');
  }

  const indexPath = getIndexPath();
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`Error sending file ${indexPath}:`, err);
      res.status(500).send('Error serving application.');
    }
  });
});

// Fallback route for single-page application
router.get('*', (req, res) => {
  // If authenticated, serve index.html for client-side routing
  // If not, redirect to CAS login
  if (isAuthenticated(req)) {
    const indexPath = getIndexPath();
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`Error sending file ${indexPath}:`, err);
        res.status(500).send('Error serving application.');
      }
    });
  } else {
    res.redirect('/');
  }
});

module.exports = router;