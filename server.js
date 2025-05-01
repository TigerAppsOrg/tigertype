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
app.set('trust proxy', true); // Use true for built-in trust

// --- CORS ---
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
const isProd = process.env.NODE_ENV === 'production';
try {
    const serviceUrl = process.env.SERVICE_URL;
    if (isProd && serviceUrl) {
        const serviceUrlHostname = new URL(serviceUrl).hostname;
        // Set domain ONLY for the custom domain, not for default herokuapp.com domains
        if (!serviceUrlHostname.endsWith('herokuapp.com')) {
             cookieDomain = serviceUrlHostname;
             console.log(`COOKIE DOMAIN: Calculated cookie domain for production: ${cookieDomain}`);
        } else {
             console.log('COOKIE DOMAIN: Running on default Heroku domain, cookie domain not explicitly set.');
        }
    } else {
         console.log(`COOKIE DOMAIN: Not in production (isProd=${isProd}) or SERVICE_URL not set, cookie domain not explicitly set.`);
    }
} catch (e) {
    console.error("Error parsing SERVICE_URL for cookie domain:", e);
}
// Log the final value being used
console.log(`COOKIE DOMAIN: Effective value being used: ${cookieDomain}`);

app.use((req, res, next) => {
  // Only log for relevant paths to reduce noise
  if (req.path.startsWith('/auth/') || req.path === '/' || req.path === '/home') {
      console.log(`[DIAGNOSTIC LOG] Path: ${req.path}`);
      console.log(`[DIAGNOSTIC LOG] Headers:`, {
          'host': req.headers['host'],
          'x-forwarded-proto': req.headers['x-forwarded-proto'],
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'cookie': req.headers['cookie'] || 'None'
      });
      // req.secure relies on 'trust proxy' having been set already
      console.log(`[DIAGNOSTIC LOG] req.protocol: ${req.protocol}, req.secure: ${req.secure}`);
  }
  next();
});

// --- Session Middleware ---
const sessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions',
    errorLog: console.error.bind(console, 'Postgres Session Store Error:')
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  name: 'connect.sid',
  proxy: true, // Keep this alongside app.set('trust proxy', ...)
  cookie: {
    secure: isProd,               // Should be true in production
    path: '/',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',             // Keep as 'lax' (default works too)
    domain: cookieDomain,        // Use the calculated domain
  }
});

app.use(sessionMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static files and Routes ---
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  console.log('Production mode: Serving static files from client/dist');

  // API/Auth routes BEFORE catch-all
  app.use(routes);

  // SPA Catch-all
  app.get('*', (req, res) => {
    // Check auth status *before* sending index.html for non-API routes
    // to potentially redirect unauth users to login immediately
    if (!isAuthenticated(req) && !req.path.startsWith('/api/') && !req.path.startsWith('/auth/')) {
         // If trying to access a frontend route other than /, redirect to start auth flow
         console.log(`Unauthenticated access to SPA route ${req.path}, redirecting to /auth/login`);
         return res.redirect('/auth/login'); // Or just res.redirect('/') which triggers casAuth
    }
    // Serve index.html for authenticated users or allowed paths
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
    res.json({ message: 'TigerType API Server', /* ... */ });
  });
}

// --- Socket.IO Setup ---
io.use((socket, next) => {
  console.log('Socket middleware: sharing session...');
  sessionMiddleware(socket.request, socket.request.res || {}, next); // Pass res if available
});

io.use(async (socket, next) => {
    const req = socket.request;
    console.log('Socket middleware: authenticating connection...', socket.id);

    // Debug: Log session state at start
    console.log('Socket Auth - Session ID:', req.sessionID);
    // console.log('Socket Auth - Session Data:', JSON.stringify(req.session)); // Careful with sensitive data

    if (!isAuthenticated(req)) {
        console.error(`Socket authentication failed for socket ${socket.id}: User not authenticated in session.`);
        return next(new Error('Authentication required'));
    }

     try {
        if (!req.session || !req.session.userInfo || !req.session.userInfo.user) {
            console.error(`Socket authentication failed for socket ${socket.id}: Session or userInfo missing.`);
            return next(new Error('Invalid session state'));
        }
        const netid = req.session.userInfo.user;

        const UserModel = require('./server/models/user');
        const user = await UserModel.findOrCreate(netid);

        if (!user || !user.id) {
          console.error(`Socket authentication failed for socket ${socket.id}: Could not find/create user for ${netid}`);
          return next(new Error('Failed to identify user in database'));
        }

        socket.userInfo = {
          ...(req.session.userInfo || {}),
          userId: user.id,
          netid: user.netid
        };

        if (!req.session.userInfo.userId) {
          req.session.userInfo.userId = user.id;
          req.session.save(err => {
            if (err) {
              console.error(`Error saving session during socket auth for socket ${socket.id}:`, err);
            } else {
              console.log(`Session updated with userId during socket auth for socket ${socket.id}`);
            }
          });
        }

        console.log(`Socket auth success for socket ${socket.id} (netid: ${netid}, userId: ${user.id})`);
        next();
      } catch (err) {
        console.error(`Socket authentication error for socket ${socket.id}:`, err);
        return next(new Error('Authentication error'));
      }
});

socketHandler.initialize(io);

// --- Server Start ---
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
          // check for users with null/0 fastest_wpm but have race results > 0
          const result = await client.query(`
            SELECT COUNT(*) FROM users
            WHERE (fastest_wpm IS NULL OR fastest_wpm = 0)
            AND id IN (SELECT DISTINCT user_id FROM race_results WHERE wpm > 0)
          `);
          const discrepancyCount = parseInt(result.rows[0].count);
          if (discrepancyCount > 0) {
            console.log(`Found ${discrepancyCount} users with fastest_wpm = 0/null but have race results > 0`);
            const dbHelpers = require('./server/utils/db-helpers'); // Ensure db-helpers is required correctly
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
       // Log the intended cookie settings using the variables available
       console.log('Effective Cookie Settings Expected:', JSON.stringify({
           secure: isProd,
           path: '/',
           httpOnly: true,
           maxAge: 24 * 60 * 60 * 1000,
           sameSite: 'lax',
           domain: cookieDomain,
       }));
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();