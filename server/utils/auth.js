/**
 * auth.js
 * CAS Authentication module for TigerType
 * slightly modified from og template
 */

const axios = require('axios');
const querystring = require('querystring');
const { URL } = require('url'); // Import URL constructor
const path = require('path');

// CAS URL for Princeton authentication
const CAS_URL = 'https://fed.princeton.edu/cas/';

// Frontend URL for redirects
const FRONTEND_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5174'  // Development frontend URL
  : process.env.SERVICE_URL; // Production frontend URL

/**
 * strip ticket parameter from URL
 * @param {string} urlStr - URL to strip the ticket from
 * @returns {string} URL w/o the ticket parameter
 */
function stripTicket(urlStr) {
  if (!urlStr) {
    return "something is badly wrong";
  }
  
  try {
    const parsedUrl = new URL(urlStr);
    parsedUrl.searchParams.delete('ticket');
    return parsedUrl.toString();
  } catch (error) {
    console.error("Error parsing URL in stripTicket:", urlStr, error);
    return urlStr; // Return original string if parsing fails
  }
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
    try {
      const serviceUrl = new URL('/auth/login', FRONTEND_URL).toString(); // Use URL constructor
      const loginUrl = new URL('login', CAS_URL);
      loginUrl.searchParams.set('service', serviceUrl);
      console.debug('Redirecting to:', loginUrl.toString());
      return res.redirect(loginUrl.toString());
    } catch (error) {
      console.error("Error constructing CAS login URL:", error);
      return res.status(500).send('Authentication configuration error');
    }
  }
  
  console.debug('CAS ticket found, validating ticket:', ticket);
  
  // Construct the original request URL correctly for validation
  let requestUrl;
  try {
    // req.originalUrl might contain leading slashes we need to handle
    const pathName = req.originalUrl.startsWith('//') ? req.originalUrl.substring(1) : req.originalUrl;
    requestUrl = new URL(pathName, FRONTEND_URL).toString();
  } catch (error) {
    console.error("Error constructing request URL for validation:", error);
    return res.status(500).send('Authentication error');
  }

  // validate the ticket
  validate(ticket, requestUrl)
    .then(userInfo => {
      if (!userInfo) {
        // if ticket invalid, redirect to CAS login again
        console.debug('Invalid CAS ticket, redirecting to CAS login...');
        try {
          const serviceUrl = new URL('/auth/login', FRONTEND_URL).toString();
          const loginUrl = new URL('login', CAS_URL);
          loginUrl.searchParams.set('service', serviceUrl);
          return res.redirect(loginUrl.toString());
        } catch (error) {
          console.error("Error constructing CAS login URL on invalid ticket:", error);
          return res.status(500).send('Authentication configuration error');
        }
      }
      
      console.debug('CAS authentication successful, user info:', userInfo);
      
      // store user info in session 
      req.session.userInfo = userInfo;
      
      // Create or update user in the database
      const UserModel = require('../models/user');
      const netid = userInfo.user; // Extract netid from CAS response
      
      console.log('Creating or updating user in database for netid:', netid);
      
      UserModel.findOrCreate(netid)
        .then(user => {
          console.log('User created/found in database:', user);
          req.session.userInfo.userId = user.id;
          
          // Explicitly save the session before redirecting
          req.session.save((err) => {
            if (err) {
              console.error('Error saving session before redirect:', err);
              // Handle error appropriately, maybe redirect to an error page or login
              return res.status(500).send('Error saving session'); 
            }
            
            // Ensure redirect URL is correct
            const homeUrl = new URL('/home', FRONTEND_URL).toString();
            console.debug('Session saved, redirecting to home:', homeUrl);
            res.redirect(homeUrl);
          });
        })
        .catch(err => {
          console.error('Error creating/finding user in database:', err);
          // Still try to redirect to home page even if DB op fails, but save session first
          req.session.save((saveErr) => {
             if (saveErr) {
               console.error('Error saving session on DB error path:', saveErr);
               return res.status(500).send('Error saving session');
             }
             const homeUrl = new URL('/home', FRONTEND_URL).toString();
             res.redirect(homeUrl);
          });
        });
    })
    .catch(error => {
      console.error('Error during CAS authentication process:', error);
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
  // Always redirect to frontend landing page
  res.redirect(`${FRONTEND_URL}/`);
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