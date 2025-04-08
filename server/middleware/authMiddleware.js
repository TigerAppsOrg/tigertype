/**
 * Authentication middleware for protecting routes that require a logged-in user
 * (idt this is necessary, but josh would be disappointed in me if i didnt have this smh)
 */

const { isAuthenticated } = require('../utils/auth');
const UserModel = require('../models/user');

/**
 * Middleware to ensure a route is only accessible to authenticated users
 * Also attaches the user object to the request for easy access in subsequent middleware/controllers
 */
const ensureAuthenticated = async (req, res, next) => {
  // First check if user is authenticated via CAS
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Get netid from session
    const netid = req.session.userInfo.user;
    
    if (!netid) {
      return res.status(401).json({ message: 'User information missing from session' });
    }

    // Get user from database or create if not exists
    const user = await UserModel.findOrCreate(netid);
    
    if (!user) {
      return res.status(500).json({ message: 'Failed to retrieve or create user' });
    }

    // Attach user info to the request object for subseuqnet middleware/handlers
    req.user = {
      id: user.id,
      netid: user.netid,
      bio: user.bio,
      avatar_url: user.avatar_url
    };

    // Also ensure userId is in session
    if (!req.session.userInfo.userId) {
      req.session.userInfo.userId = user.id;
      req.session.save(err => {
        if (err) {
          console.error('Error saving session:', err);
        }
      });
    }

    next();
  } catch (error) {
    console.error('Error in ensureAuthenticated middleware:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

module.exports = {
  ensureAuthenticated
}; 