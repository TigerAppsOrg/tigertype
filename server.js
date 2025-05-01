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
const { URL } = require('url');

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

// Required for secure cookies/protocol detection behind proxies like Heroku + Cloudflare;
// trust the full chain so req.secure works correctly
app.set('trust proxy', true);

// Configure CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? process.env.SERVICE_URL : 'http://localhost:5174',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};
app.use(cors(corsOptions));

// --- Cookie Domain Logic ---
let cookieDomain;
try {
    const serviceUrl = process.env.SERVICE_URL;
    if (process.env.NODE_ENV === 'production' && serviceUrl) {
        const serviceUrlHostname = new URL(serviceUrl).hostname;
        if (!serviceUrlHostname.endsWith('herokuapp.com')) {
             cookieDomain = serviceUrlHostname;
             console.log(`COOKIE DOMAIN: Set cookie domain for production: ${cookieDomain}`);
        } else {
             console.log('COOKIE DOMAIN: Running on default Heroku domain, cookie domain not explicitly set.');
        }
    } else {
         console.log('COOKIE DOMAIN: Not in production or SERVICE_URL not set, cookie domain not explicitly set.');
    }
} catch (e) {
    console.error("Error parsing SERVICE_URL for cookie domain:", e);
}

// Configure session middleware
const sessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions',
    errorLog: console.error.bind(console, 'Postgres Session Store Error:')
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    path: '/', // Explicitly set Path to root,,, istg is this was the problem
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: cookieDomain, 
  }
});

// Use session middleware for Express
app.use(sessionMiddleware);

// Parse JSON + URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving and routing based on environment
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
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
  app.use(routes);
  app.get('/', (req, res) => {
    res.json({
      message: 'TigerType API Server',
      note: `Please access the frontend at ${process.env.NODE_ENV === 'development' ? 'http://localhost:5174' : process.env.SERVICE_URL}`,
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

  if (!isAuthenticated(req)) {
    console.error('Socket authentication failed: User not authenticated');
    return next(new Error('Authentication required'));
  }
  try {
    const netid = req.session.userInfo.user;
    if (!netid) {
      console.error('Socket authentication failed: Missing netid');
      return next(new Error('Invalid authentication: Missing netid'));
    }
    console.log(`Socket auth: Found netid ${netid}, looking up in database...`);
    let user = null;
    let userId = null;
    try {
      const UserModel = require('./server/models/user');
      user = await UserModel.findOrCreate(netid);
      if (user) {
        userId = user.id;
      }
    } catch (dbErr) {
      console.error('Database error during socket authentication:', dbErr);
      console.log('Continuing with basic user info from session...');
      if (req.session.userInfo.userId) {
        userId = req.session.userInfo.userId;
      } else {
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

    if (!userId) {
      console.error(`Socket authentication failed: Could not find/create user for ${netid}`);
      return next(new Error('Failed to identify user in database'));
    }
    socket.userInfo = {
      ...req.session.userInfo,
      userId: userId
    };
    if (!req.session.userInfo.userId) {
      req.session.userInfo.userId = userId;
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
    console.log(`${process.env.NODE_ENV} mode detected - checking database state...`);
    try {
      const db = require('./server/db');
      await db.initDB();
      console.log('Database initialized successfully.');
      console.log('Running database migrations...');
      await runMigrations();
      console.log('Database migrations completed.');
      try {
        const client = await pool.connect();
        try {
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
      }
    } catch (err) {
      console.error('Database initialization failed:', err);
      console.log('Continuing server startup despite database initialization failure');
    }

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Frontend URL: ${process.env.NODE_ENV === 'production' ? process.env.SERVICE_URL : 'http://localhost:5174'}`);
      console.log(`Cookie Domain Configured: ${cookieDomain || 'Default (Host Only)'}`);
      if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'tigertype-fallback-secret-change-me') {
          console.warn('WARNING: SESSION_SECRET is not set or using the insecure default. Please set a strong secret in Heroku Config Vars.');
      } else {
           console.log('SESSION_SECRET is set.');
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();