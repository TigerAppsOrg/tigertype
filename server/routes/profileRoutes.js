const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Route to update user bio (requires auth)
router.post('/bio', ensureAuthenticated, profileController.updateBio);

// Route to upload user avatar (requires auth)
router.post('/avatar', ensureAuthenticated, profileController.uploadAvatar);

module.exports = router; 