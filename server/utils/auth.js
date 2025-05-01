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
const FRONTEND_URL = process.env.SERVICE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5174' : '');
if (!FRONTEND_URL) {
    console.error("FATAL: SERVICE_URL environment variable is not set.");
    // Optionally exit or throw an error in production
    // process.exit(1);
}


/**
 * strip ticket parameter from URL
 * @param {string} urlStr - URL to strip the ticket from
 * @returns {string} URL w/o the ticket parameter
 */
function stripTicket(urlStr) {
  if (!urlStr) {
    console.error("stripTicket received invalid URL string:", urlStr);
    // Return a default or handle error appropriately
    // For safety, maybe return the CAS base URL or the frontend URL
    return FRONTEND_URL || CAS_URL;
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
    // Ensure serviceUrl is valid before proceeding
    if (!serviceUrl || !serviceUrl.startsWith('http')) {
         console.error("Invalid serviceUrl generated for CAS validation:", serviceUrl, "Original Request URL:", requestUrl);
         throw new Error("Invalid service URL for CAS validation");
    }

    const validationUrl = `${CAS_URL}validate?service=${encodeURIComponent(serviceUrl)}&ticket=${encodeURIComponent(ticket)}&format=json`;
    console.debug('CAS Validation URL:', validationUrl); // Log the validation URL

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
    // Log specific axios errors if available
    if (error.response) {
        console.error('Error validating CAS ticket - Axios Response Error:', {
            status: error.response.status,
            headers: error.response.headers,
            data: error.response.data,
            validationUrl: `${CAS_URL}validate?service=...&ticket=...` // Avoid logging full ticket/service
        });
    } else if (error.request) {
        console.error('Error validating CAS ticket - Axios Request Error:', error.request);
    } else {
        console.error('Error validating CAS ticket - General Error:', error.message, error.stack);
    }
    return null; // Return null on any validation error
  }
}

/**
 * Authentication middleware for Express
 * Redirects to CAS login if not authenticated
 */
async function casAuth(req, res, next) { // Make the middleware async
  console.debug('CAS Auth middleware called, checking authentication...');

  // if user already auth, proceed
  if (req.session && req.session.userInfo && req.session.userInfo.user) {
    console.debug('User already authenticated:', req.session.userInfo.user);
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
      console.debug('Redirecting to CAS login:', loginUrl.toString());
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
    // Use req.protocol and req.get('host') for reliability behind proxies
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    // Reconstruct the full URL including the path and query string from the original request
    requestUrl = `${protocol}://${host}${req.originalUrl}`;
    // Validate the constructed URL
    new URL(requestUrl); // Throws error if invalid
    console.debug('Constructed Request URL for validation:', requestUrl);
  } catch (error) {
    console.error("Error constructing request URL for validation:", error, {
        protocol: req.protocol,
        host: req.get('host'),
        originalUrl: req.originalUrl,
        headers: req.headers // Log headers for proxy info
    });
    return res.status(500).send('Authentication error: Could not determine request URL');
  }

  // Validate the ticket
  try {
    const userInfo = await validate(ticket, requestUrl);

    if (!userInfo) {
      // if ticket invalid, redirect to CAS login again
      console.warn('Invalid CAS ticket received, redirecting to CAS login...');
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

    // 1. Store user info in session immediately
    req.session.userInfo = userInfo;
    const netid = userInfo.user; // Extract netid

    // 2. Explicitly wait for session save BEFORE database operations & redirect
    await new Promise((resolve, reject) => {
        req.session.save(err => {
            if (err) {
                console.error('Error saving session after validation:', err);
                return reject(err); // Reject the promise on error
            }
            console.debug('Session saved successfully after validation. Session ID:', req.sessionID);
            resolve(); // Resolve the promise on success
        });
    });

    // 3. Perform database operation (user creation/update) *after* session is saved
    const UserModel = require('../models/user');
    console.log('(Post-session save) Creating or updating user in database for netid:', netid);

    const user = await UserModel.findOrCreate(netid);
    console.log('User created/found in database:', user);

    // 4. Update session with userId if needed, and save again (ensures userId is available for socket auth later)
    if (user && user.id && (!req.session.userInfo || !req.session.userInfo.userId)) {
         if (!req.session.userInfo) req.session.userInfo = {}; // Initialize if somehow missing
         req.session.userInfo.userId = user.id;
         await new Promise((resolve, reject) => { // Wait for this save too
             req.session.save(err => {
                  if (err) {
                     console.error('Error saving session after adding userId:', err);
                     // Decide how to handle - log and continue redirect?
                     // Or reject and potentially redirect to login? Let's log and continue for now.
                     reject(err); // Rejecting might be safer if userId is critical immediately
                  } else {
                     console.log('Session updated with userId.');
                     resolve();
                  }
             });
         });
    }

    // 5. Redirect to home page
    const homeUrl = new URL('/home', FRONTEND_URL).toString();
    console.debug('Redirecting to home after DB operation:', homeUrl);
    res.redirect(homeUrl);

  } catch (error) {
    // Catch errors from validate(), session save, or DB operations
    console.error('Error during CAS authentication process or post-validation:', error);

    // Attempt to redirect to CAS login as a fallback
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
  // Check that session exists with userInfo that has a valid CAS user field
  const authenticated = !!(req.session &&
                         req.session.userInfo &&
                         req.session.userInfo.user);

  if (authenticated) {
      console.debug('isAuthenticated check: TRUE for user', req.session.userInfo.user, 'Session ID:', req.sessionID);
  } else {
      console.debug('isAuthenticated check: FALSE. Session:', req.session ? `Exists (ID: ${req.sessionID})` : 'Does not exist');
      if(req.session) {
          console.debug('Session userInfo:', req.session.userInfo);
      }
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
         // Clear the cookie manually AFTER destroying session seems redundant
         // but can sometimes help ensure browser removes it.
         // The domain MUST match the one used when setting the cookie.
         const cookieDomain = process.env.NODE_ENV === 'production'
             ? (new URL(FRONTEND_URL).hostname.endsWith('herokuapp.com') ? undefined : new URL(FRONTEND_URL).hostname)
             : undefined;
         res.clearCookie('connect.sid', { path: '/', domain: cookieDomain }); // Use default 'connect.sid' or your session name if different

        // Redirect to the landing page
        try {
            const landingUrl = new URL('/', FRONTEND_URL).toString();
            console.log(`Redirecting logged out user to: ${landingUrl}`);
            res.redirect(landingUrl);
        } catch (error) {
            console.error('Error constructing landing page URL during logout:', error);
            res.redirect('/'); // Fallback redirect
        }
    });
  } else {
    // If no session, just redirect
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
    // The service URL for CAS logout should be the route that handles app logout
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
  logoutCAS
};