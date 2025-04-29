// is this file unncessary? maybe, but it looks cleaner
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Route to update user bio (requires auth)
router.post('/bio', ensureAuthenticated, profileController.updateBio);

// Route to upload user avatar (requires auth)
router.post('/avatar', ensureAuthenticated, profileController.uploadAvatar);

// Route to mark tutorial as complete (requires auth)
router.put('/tutorial-complete', ensureAuthenticated, profileController.markTutorialComplete);
// Route to update user's selected title (requires auth)
router.put('/title', ensureAuthenticated, profileController.updateTitle);

module.exports = router; 