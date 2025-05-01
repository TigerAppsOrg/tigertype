/**
 * auth.js
 * CAS Authentication module for TigerType
 * slightly modified from og template
 */

const axios = require('axios');
const querystring = require('querystring');
const { URL } = require('url');
const path = require('path');

// CAS URL for Princeton authentication
const CAS_URL = 'https://fed.princeton.edu/cas/';

// Frontend URL for redirects - FORCE HTTPS in production
const FRONTEND_URL = process.env.NODE_ENV === 'production'
    ? (process.env.SERVICE_URL || 'https://type.tigerapps.org') // Default to HTTPS if SERVICE_URL missing, but should be set
    : 'http://localhost:5174'; // Use HTTP for local dev

// Validate FRONTEND_URL format early
try {
    new URL(FRONTEND_URL);
} catch (e) {
    console.error("FATAL: Invalid FRONTEND_URL:", FRONTEND_URL, e);
    process.exit(1); // Exit if the base URL is invalid
}


/**
 * strip ticket parameter from URL
 * @param {string} urlStr - URL to strip the ticket from
 * @returns {string} URL w/o the ticket parameter
 */
function stripTicket(urlStr) {
  if (!urlStr) {
    console.error("stripTicket received invalid URL string:", urlStr);
    return FRONTEND_URL; // Return base URL as a fallback
  }
  try {
    const parsedUrl = new URL(urlStr);
    parsedUrl.searchParams.delete('ticket');
    if (process.env.NODE_ENV === 'production') {
        parsedUrl.protocol = 'https:';
    }
    return parsedUrl.toString();
  } catch (error) {
    console.error("Error parsing URL in stripTicket:", urlStr, error);
    return urlStr;
  }
}

/**
 * valide a login ticket by contacting CAS server
 * @param {string} ticket - CAS ticket to validate
 * @param {string} requestUrl - original request URL (used to derive serviceUrl)
 * @returns {Promise<Object|null>} user info if auth successful, null otherwise
 */
async function validate(ticket, requestUrl) {
  try {
    const serviceUrl = stripTicket(requestUrl);

    if (!serviceUrl || !serviceUrl.startsWith('http')) {
         console.error("Invalid serviceUrl generated for CAS validation:", serviceUrl, "Original Request URL:", requestUrl);
         throw new Error("Invalid service URL for CAS validation");
    }

    const validationUrl = `${CAS_URL}validate?service=${encodeURIComponent(serviceUrl)}&ticket=${encodeURIComponent(ticket)}&format=json`;
    console.debug('CAS Validation URL:', validationUrl);

    const response = await axios.get(validationUrl);
    const result = response.data;

    if (!result || !result.serviceResponse) {
      console.warn('Unexpected CAS validation response format:', result);
      return null;
    }

    const serviceResponse = result.serviceResponse;

    if (serviceResponse.authenticationSuccess) {
      return serviceResponse.authenticationSuccess;
    }

    if (serviceResponse.authenticationFailure) {
      console.warn('CAS authentication failure:', serviceResponse.authenticationFailure);
      return null;
    }

    console.warn('Unexpected CAS response content:', serviceResponse);
    return null;
  } catch (error) {
    if (error.response) {
        console.error('Error validating CAS ticket - Axios Response Error:', { status: error.response.status, data: error.response.data });
    } else if (error.request) {
        console.error('Error validating CAS ticket - Axios Request Error (No Response)');
    } else {
        console.error('Error validating CAS ticket - General Error:', error.message);
    }
    console.error('Validation URL attempted (ticket redacted):', `${CAS_URL}validate?service=${encodeURIComponent(stripTicket(requestUrl))}&ticket=REDACTED&format=json`);
    return null;
  }
}

/**
 * Authentication middleware for Express
 * Redirects to CAS login if not authenticated
 */
async function casAuth(req, res, next) {
  console.debug('CAS Auth middleware called, checking authentication...');

  // Add check for session existence
  if (!req.session) {
      console.error('Session object is missing from request during casAuth!');
      return res.status(500).send('Session configuration error.');
  }


  if (req.session && req.session.userInfo && req.session.userInfo.user) {
    console.debug('User already authenticated:', req.session.userInfo.user);
    return next();
  }

  const ticket = req.query.ticket;

  if (!ticket) {
    console.debug('No CAS ticket found, redirecting to CAS login...');
    try {
      // Use FRONTEND_URL to construct the service URL's base path
      const serviceUrl = new URL('/auth/login', FRONTEND_URL).toString();
      const loginUrl = new URL('login', CAS_URL);
      loginUrl.searchParams.set('service', serviceUrl);
      console.debug('Redirecting to CAS login:', loginUrl.toString());
      return res.redirect(loginUrl.toString());
    } catch (error) {
      console.error("Error constructing CAS login URL:", error);
      return res.status(500).send('Authentication configuration error');
    }
  }

  console.debug('CAS ticket found, validating ticket:', ticket);

  let incomingRequestUrl;
  try {
    // Construct the URL based on the reliable FRONTEND_URL base
    // and the original path + query string from the request.
    // This ensures the protocol and host match the expected service URL.
    const base = new URL(FRONTEND_URL);
    const currentPathAndQuery = req.originalUrl; // e.g., /auth/login?ticket=...
    incomingRequestUrl = new URL(currentPathAndQuery, base).toString();

    // Log the revised URL
    console.debug('Constructed Incoming Request URL for validation (Revised):', incomingRequestUrl);

    // Basic validation
    new URL(incomingRequestUrl);

  } catch (error) {
    console.error("Error constructing request URL for validation:", error);
    return res.status(500).send('Authentication error: Could not determine request URL');
  }

  try {
    const userInfo = await validate(ticket, incomingRequestUrl);

    if (!userInfo) {
      console.warn('Invalid CAS ticket received (validation failed), redirecting to CAS login...');
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

    // Ensure req.session exists before trying to assign to it
    if (!req.session) {
       console.error('Session object became unavailable before assignment!');
       // Handle error: maybe redirect to login again or show an error page
       return res.status(500).send('Session error after validation.');
    }

    req.session.userInfo = userInfo;
    const netid = userInfo.user;

    // Make session saving robust
    await new Promise((resolve, reject) => {
        req.session.save(err => {
            if (err) {
                console.error('Error saving session after validation:', err);
                return reject(new Error('Failed to save session after validation.'));
            }
            console.debug('Session saved successfully after validation. Session ID:', req.sessionID);
            resolve();
        });
    });


    // Ensure UserModel is required here if not globally available
    const UserModel = require('../models/user');
    console.debug('(Post-session save) Creating or updating user in database for netid:', netid);
    const user = await UserModel.findOrCreate(netid); // This already handles findOrCreate
    console.debug('User created/found in database:', user ? { id: user.id, netid: user.netid } : null);

    // Add userId to session if found/created and not already there
    if (user && user.id) {
      // Check if session still exists (paranoia check)
      if (!req.session) {
          console.error('Session object became unavailable before adding userId!');
          throw new Error('Session became unavailable before adding userId.');
      }
      if (!req.session.userInfo) {
          console.warn('req.session.userInfo was missing before adding userId, recreating.');
          req.session.userInfo = {}; // Recreate if somehow lost
      }
       if (!req.session.userInfo.userId || req.session.userInfo.userId !== user.id) {
         console.debug(`Updating session with userId: ${user.id}`);
         req.session.userInfo.userId = user.id;
         // Save session again after adding userId
         await new Promise((resolve, reject) => {
             req.session.save(err => {
                  if (err) {
                     console.error('Error saving session after adding userId:', err);
                     // Don't necessarily reject, log the error but proceed with redirect
                     resolve(); // Or decide to reject based on severity
                  } else {
                     console.debug('Session updated successfully with userId.');
                     resolve();
                  }
             });
         });
       } else {
           console.debug('userId already present and correct in session.');
       }
    } else {
        console.error('Failed to get user ID after findOrCreate for netid:', netid);
        // Handle appropriately - maybe user creation failed silently?
        throw new Error('Failed to retrieve user ID after database operation.');
    }

    // Redirect to the frontend home page (React Router will handle /home)
    // Use FRONTEND_URL to ensure correct protocol and domain
    const homeRedirectUrl = new URL('/', FRONTEND_URL).toString(); // Redirect to root, let client handle /home route
    console.debug('Redirecting to frontend root after DB operation:', homeRedirectUrl);
    res.redirect(homeRedirectUrl);

  } catch (error) {
    console.error('Error during CAS authentication process or post-validation:', error);
    // Fallback redirect to login
    try {
      const serviceUrl = new URL('/auth/login', FRONTEND_URL).toString();
      const loginUrl = new URL('login', CAS_URL);
      loginUrl.searchParams.set('service', serviceUrl);
      return res.redirect(loginUrl.toString());
    } catch (urlError) {
      console.error("Error constructing fallback CAS login URL:", urlError);
      return res.status(500).send('Authentication error');
    }
  }
}

/**
 * Check if a user is authenticated
 * @param {Object} req - Express request object
 * @returns {boolean} True if authenticated, false otherwise
 */
function isAuthenticated(req) {
  const authenticated = !!(req.session && req.session.userInfo && req.session.userInfo.user);
  if (!authenticated) {
      console.debug('isAuthenticated check: FALSE. Session ID:', req.sessionID, 'Session Exists:', !!req.session, 'UserInfo Exists:', !!req.session?.userInfo);
  } else {
       console.debug('isAuthenticated check: TRUE. User:', req.session.userInfo.user, 'Session ID:', req.sessionID);
  }
  return authenticated;
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
  const userNetid = req.session?.userInfo?.user || 'unknown';
  console.log(`Logging out user ${userNetid} from the application.`);
  if (req.session) {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
         let cookieDomain;
         try {
             if (process.env.NODE_ENV === 'production' && FRONTEND_URL) {
                 const hostname = new URL(FRONTEND_URL).hostname;
                 if (!hostname.endsWith('herokuapp.com')) {
                     cookieDomain = hostname;
                 }
             }
         } catch(e) { console.error("Error parsing FRONTEND_URL for cookie domain in logout", e); }
         res.clearCookie('connect.sid', { path: '/', domain: cookieDomain });

        try {
            const landingUrl = new URL('/', FRONTEND_URL).toString();
            console.log(`Redirecting logged out user to: ${landingUrl}`);
            res.redirect(landingUrl);
        } catch (error) {
            console.error('Error constructing landing page URL during logout:', error);
            res.redirect('/');
        }
    });
  } else {
     try {
        const landingUrl = new URL('/', FRONTEND_URL).toString();
        res.redirect(landingUrl);
     } catch (error) {
        res.redirect('/');
     }
  }
}


/**
 * Log out from CAS and then from the application
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function logoutCAS(req, res) {
  const userNetid = req.session?.userInfo?.user || 'unknown';
  console.log(`Initiating CAS logout for user ${userNetid}.`);
  try {
    const appLogoutUrl = new URL('/auth/logout', FRONTEND_URL).toString();
    const logoutUrl = new URL('logout', CAS_URL);
    logoutUrl.searchParams.set('service', appLogoutUrl);
    console.log(`Redirecting user ${userNetid} to CAS logout URL: ${logoutUrl.toString()}`);
    res.redirect(logoutUrl.toString());
  } catch(error) {
      console.error('Error constructing CAS logout URL:', error);
      res.status(500).send('Logout configuration error');
  }
}

module.exports = {
  casAuth,
  isAuthenticated,
  getAuthenticatedUser,
  logoutApp,
  logoutCAS,
  stripTicket // Ensure stripTicket is also exported if needed elsewhere
};