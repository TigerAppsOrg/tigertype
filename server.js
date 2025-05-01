/**
 * TigerType Server
 * A Princeton-themed typing platform for speed typing practice and races
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const os = require('os');
const socketIO = require('socket.io');
const { isAuthenticated, logoutApp, logoutCAS } = require('./server/utils/auth');
const routes = require('./server/routes');
const socketHandler = require('./server/controllers/socket-handlers');
const db = require('./server/db');
const cors = require('cors');
const fs = require('fs');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./server/config/database');
const { initDB, logDatabaseState } = require('./server/db');
const { runMigrations } = require('./server/db/migrations');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? process.env.SERVICE_URL : 'http://localhost:5174',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// --- Trust Proxy --- 
// // Required for secure cookies/protocol detection behind proxies like Heroku + Cloudflare
// app.set('trust proxy', 1);

// // Force HTTPS redirect in production to ensure secure cookies are set over HTTPS
// if (process.env.NODE_ENV === 'production') {
//   app.use((req, res, next) => {
//     if (req.secure) {
//       return next();
//     }
//     return res.redirect(301, 'https://' + req.headers.host + req.url);
//   });
// }

// Required for secure cookies/protocol detection behind proxies like Heroku + Cloudflare; 
// trust the full chain so req.secure works correctly
app.set('trust proxy', true);

// Configure CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' ? 'http://localhost:5174' : process.env.SERVICE_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Configure session middleware
const sessionMiddleware = session({
  proxy: process.env.NODE_ENV === 'production', // trust first proxy in Heroku for proper secure cookie handling
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET || 'tigertype-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none', // explicitly allow cross-site navigation (CAS redirects)
    domain: process.env.NODE_ENV === 'production' ? new URL(process.env.SERVICE_URL).hostname : undefined
  }
});

// Use session middleware for Express
app.use(sessionMiddleware);

// Parse JSON + URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving and routing based on environment
if (process.env.NODE_ENV === 'production') {
  // Serve the React app's static files FROM client/dist
  app.use(express.static(path.join(__dirname, 'client/dist')));

  // Log directory contents for debugging (optional, can be removed after verification)
  console.log('Production mode: Serving static files from client/dist');
  try {
    const clientDistPath = path.join(__dirname, 'client/dist');
    console.log(`Checking existence of: ${clientDistPath}`);
    console.log('Client/dist dir exists:', require('fs').existsSync(clientDistPath));
    const indexPath = path.join(clientDistPath, 'index.html');
    console.log(`Checking existence of: ${indexPath}`);
    console.log('Index.html exists:', require('fs').existsSync(indexPath));
  } catch (err) {
    console.error('Error checking directories:', err);
  }

  // API and auth routes should be defined before the catch-all
  app.use(routes);

  // For any other routes in production, serve the React app's index.html
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'client/dist/index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`Error sending file ${indexPath}:`, err);
        res.status(500).send('Error serving application.');
      }
    });
  });

} else { // Development mode
  // Use API and auth routes
  app.use(routes);

  // Development mode - return API message for root route
  app.get('/', (req, res) => {
    res.json({
      message: 'TigerType API Server',
      note: `Please access the frontend at ${process.env.NODE_ENV === 'development' ? 'http://localhost:5174' : process.env.SERVICE_URL}`, // Assuming 5174 for Vite dev server
      environment: 'development'
    });
  });
}

// Share session between Express and Socket.io
io.use((socket, next) => {
  console.log('Socket middleware: sharing session...');
  sessionMiddleware(socket.request, {}, next);
});

// Socket authentication middleware
io.use(async (socket, next) => {
  const req = socket.request;
  
  console.log('Socket middleware: authenticating connection...', socket.id);
  
  // If user isn't authenticated, reject the socket connection
  if (!isAuthenticated(req)) {
    console.error('Socket authentication failed: User not authenticated');
    return next(new Error('Authentication required'));
  }
  
  try {
    // Get the netid from session
    const netid = req.session.userInfo.user;
    
    // Make sure we have a valid netid
    if (!netid) {
      console.error('Socket authentication failed: Missing netid');
      return next(new Error('Invalid authentication: Missing netid'));
    }
    
    console.log(`Socket auth: Found netid ${netid}, looking up in database...`);
    
    // Get user from db
    let user = null;
    let userId = null;

    try {
      // First try to use the UserModel
      const UserModel = require('./server/models/user');
      user = await UserModel.findOrCreate(netid);
      
      if (user) {
        userId = user.id;
      }
    } catch (dbErr) {
      // If db error, log but continue w/ basic authentication
      console.error('Database error during socket authentication:', dbErr);
      console.log('Continuing with basic user info from session...');
      
      // Use the user ID from session if available
      if (req.session.userInfo.userId) {
        userId = req.session.userInfo.userId;
      } else {
        // Last resort - try a direct DB query for just the ID
        try {
          const db = require('./server/config/database');
          const result = await db.query('SELECT id FROM users WHERE netid = $1', [netid]);
          if (result.rows[0]) {
            userId = result.rows[0].id;
          }
        } catch (directDbErr) {
          console.error('Failed to get user ID directly:', directDbErr);
        }
      }
    }
    
    // If we couldn't find/create a user at all, reject the connection
    if (!userId) {
      console.error(`Socket authentication failed: Could not find/create user for ${netid}`);
      return next(new Error('Failed to identify user in database'));
    }
    
    // Add user info to socket for handlers
    socket.userInfo = {
      ...req.session.userInfo,
      userId: userId // Ensure userId is available
    };
    
    // Also update session with userId if not present
    if (!req.session.userInfo.userId) {
      req.session.userInfo.userId = userId;
      // Save session to persist the userId
      req.session.save(err => {
        if (err) {
          console.error('Error saving session:', err);
        }
      });
    }
    
    console.log(`Socket auth success for netid: ${netid}, userId: ${userId}`);
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    return next(new Error('Authentication error'));
  }
});

// Initialize socket handlers
socketHandler.initialize(io);

// Start the server
const startServer = async () => {
  try {
    // Initialize database in all environments
    console.log(`${process.env.NODE_ENV} mode detected - checking database state...`);
    
    try {
      // Import DB module
      const db = require('./server/db');
      
      // Run database initialization
      await db.initDB();
      console.log('Database initialized successfully.');

      // Run pending database migrations
      console.log('Running database migrations...');
      await runMigrations();
      console.log('Database migrations completed.');
      
      // Check for discrepancies in fastest_wpm values and fix if needed
      try {
        const client = await pool.connect();
        
        try {
          // Check if there are users with race results but fastest_wpm = 0
          const result = await client.query(`
            SELECT COUNT(*) as count
            FROM users u
            WHERE u.fastest_wpm = 0
            AND EXISTS (
              SELECT 1 FROM race_results r
              WHERE r.user_id = u.id AND r.wpm > 0
            )
          `);
          
          const discrepancyCount = parseInt(result.rows[0].count);
          
          if (discrepancyCount > 0) {
            console.log(`Found ${discrepancyCount} users with fastest_wpm = 0 but have race results > 0`);
            
            // Fix discrepancies
            const dbHelpers = require('./server/utils/db-helpers');
            await dbHelpers.updateAllUsersFastestWpm();
            
            console.log('Fixed fastest_wpm discrepancies');
          } else {
            console.log('No fastest_wpm discrepancies found');
          }
        } finally {
          client.release();
        }
      } catch (err) {
        console.error('Error checking/fixing fastest_wpm discrepancies:', err);
        // Continue starting the server even if this check fails
      }
    } catch (err) {
      console.error('Database initialization failed:', err);
      console.log('Continuing server startup despite database initialization failure');
    }
    
    // Start the server
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Frontend URL: ${process.env.NODE_ENV === 'production' ? process.env.SERVICE_URL : 'http://localhost:5174'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();