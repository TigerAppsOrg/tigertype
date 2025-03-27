/**
 * auth.js
 * CAS Authentication module for TigerType
 * slightly modified from og template
 */

const axios = require('axios');
const querystring = require('querystring');
const url = require('url');
const path = require('path');

// CAS URL for Princeton authentication
const CAS_URL = 'https://fed.princeton.edu/cas/';

// Frontend URL for redirects
const FRONTEND_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5174'  // Development frontend URL
  : process.env.FRONTEND_URL || ''; // Production frontend URL

/**
 * strip ticket parameter from URL
 * @param {string} urlStr - URL to strip the ticket from
 * @returns {string} URL w/o the ticket parameter
 */
function stripTicket(urlStr) {
  if (!urlStr) {
    return "something is badly wrong";
  }
  
  const parsedUrl = new URL(urlStr);
  parsedUrl.searchParams.delete('ticket');
  
  // if search params empty, remove ? char
  return parsedUrl.toString();
}

/**
 * valide a login ticket by contacting CAS server
 * @param {string} ticket - CAS ticket to validate
 * @param {string} requestUrl - og request URL
 * @returns {Promise<Object|null>} user info if auth successful, null otherwise
 */
async function validate(ticket, requestUrl) {
  try {
    const serviceUrl = stripTicket(requestUrl);
    const validationUrl = `${CAS_URL}validate?service=${encodeURIComponent(serviceUrl)}&ticket=${encodeURIComponent(ticket)}&format=json`;
    
    const response = await axios.get(validationUrl);
    const result = response.data;
    
    if (!result || !result.serviceResponse) {
      return null;
    }
    
    const serviceResponse = result.serviceResponse;
    
    if (serviceResponse.authenticationSuccess) {
      return serviceResponse.authenticationSuccess;
    }
    
    if (serviceResponse.authenticationFailure) {
      console.error('CAS authentication failure:', serviceResponse.authenticationFailure);
      return null;
    }
    
    console.error('Unexpected CAS response:', serviceResponse);
    return null;
  } catch (error) {
    console.error('Error validating CAS ticket:', error);
    return null;
  }
}

/**
 * Authentication middleware for Express
 * Redirects to CAS login if not authenticated
 */
function casAuth(req, res, next) {
  console.debug('CAS Auth middleware called, checking authentication...');
  
  // if user already auth, proceed
  if (req.session && req.session.userInfo) {
    console.debug('User already authenticated:', req.session.userInfo);
    return next();
  }
  
  // check for CAS ticket in query params
  const ticket = req.query.ticket;
  
  if (!ticket) {
    // redirect to CAS login if no ticket is present
    console.debug('No CAS ticket found, redirecting to CAS login...');
    const serviceUrl = `${FRONTEND_URL}/auth/login`;
    const loginUrl = `${CAS_URL}login?service=${encodeURIComponent(serviceUrl)}`;
    console.debug('Redirecting to:', loginUrl);
    return res.redirect(loginUrl);
  }
  
  console.debug('CAS ticket found, validating ticket:', ticket);
  
  // validate the ticket
  validate(ticket, FRONTEND_URL + req.originalUrl)
    .then(userInfo => {
      if (!userInfo) {
        // if ticket invalid, redirect to CAS login
        console.debug('Invalid CAS ticket, redirecting to CAS login...');
        const serviceUrl = `${FRONTEND_URL}/auth/login`;
        const loginUrl = `${CAS_URL}login?service=${encodeURIComponent(serviceUrl)}`;
        return res.redirect(loginUrl);
      }
      
      console.debug('CAS authentication successful, user info:', userInfo);
      
      // store user info in session 
      req.session.userInfo = userInfo;
      
      // Create or update user in the database
      try {
        const UserModel = require('../models/user');
        const netid = userInfo.user; // Extract netid from CAS response
        
        console.log('Creating or updating user in database for netid:', netid);
        
        // Create or update user asynchronously (don't wait for it to complete)
        UserModel.findOrCreate(netid)
          .then(user => {
            console.log('User created/found in database:', user);
            
            // Store userId in session for easier access
            req.session.userInfo.userId = user.id;
            
            // Redirect to frontend home page after successful authentication
            res.redirect(`${FRONTEND_URL}/home`);
          })
          .catch(err => {
            console.error('Error creating/finding user in database:', err);
            // Still redirect to home page even if database operation fails
            res.redirect(`${FRONTEND_URL}/home`);
          });
      } catch (err) {
        console.error('Error importing user model or handling user creation:', err);
        // Still redirect to home page even if there's an error
        res.redirect(`${FRONTEND_URL}/home`);
      }
    })
    .catch(error => {
      console.error('Error during CAS authentication:', error);
      res.status(500).send('Authentication error');
    });
}

/**
 * Check if a user is authenticated
 * @param {Object} req - Express request object
 * @returns {boolean} True if authenticated, false otherwise
 */
function isAuthenticated(req) {
  // Check that session exists with userInfo that has a valid CAS user field
  if (req.session && 
      req.session.userInfo && 
      req.session.userInfo.user) {
    console.debug('User authenticated:', req.session.userInfo.user);
    return true;
  }
  console.debug('User not authenticated');
  return false;
}

/**
 * Get authenticated user info
 * @param {Object} req - Express or Socket.IO request object
 * @returns {Object|null} User info if authenticated, null otherwise
 */
function getAuthenticatedUser(req) {
  return (req.session && req.session.userInfo) ? req.session.userInfo : null;
}

/**
 * Log out from the application
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function logoutApp(req, res) {
  if (req.session) {
    req.session.destroy();
  }
  res.sendFile(path.join(__dirname, '../../public/logged-out.html'));
}

/**
 * Log out from CAS and then from the application
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function logoutCAS(req, res) {
  const appLogoutUrl = `${req.protocol}://${req.get('host')}/auth/logout`;
  const logoutUrl = `${CAS_URL}logout?service=${encodeURIComponent(appLogoutUrl)}`;
  res.redirect(logoutUrl);
}

module.exports = {
  casAuth,
  isAuthenticated,
  getAuthenticatedUser,
  logoutApp,
  logoutCAS
}; 