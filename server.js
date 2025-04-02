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

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:5173'] 
      : false,
    credentials: true
  }
});

// --- Trust Proxy --- 
// Required for secure cookies to work correctly behind Heroku's proxy
app.set('trust proxy', 1); 

// Configure CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' ? 'http://localhost:5174' : process.env.SERVICE_URL,
  credentials: true
};
app.use(cors(corsOptions));

// Configure session middleware
const sessionMiddleware = session({
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
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
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
    
    // Ensure user exists in database
    const UserModel = require('./server/models/user');
    const user = await UserModel.findOrCreate(netid);
    
    // If we couldn't create a user, reject the connection
    if (!user) {
      console.error(`Socket authentication failed: Could not find/create user for ${netid}`);
      return next(new Error('Failed to create or find user in database'));
    }
    
    // Add user info to socket for handlers
    socket.userInfo = {
      ...req.session.userInfo,
      userId: user.id // Ensure userId is available
    };
    
    // Also update session with userId if not present
    if (!req.session.userInfo.userId) {
      req.session.userInfo.userId = user.id;
      // Save session to persist the userId
      req.session.save(err => {
        if (err) {
          console.error('Error saving session:', err);
        }
      });
    }
    
    console.log(`Socket auth success for netid: ${netid}, userId: ${user.id}`);
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    return next(new Error('Authentication error'));
  }
});

// Initialize socket handlers
socketHandler.initialize(io);

// Import the database setup function
const setupDatabase = require('./server/db/init-db');
const PORT = process.env.PORT || 3000;

// Start the server
const startServer = async () => {
  // Start listening first, so we can at least get the server running
  server.listen(PORT, () => {
    console.log('TigerType backend server listening on *:' + PORT);
    console.log('NOTE: Frontend server should be running separately on port 5174');
    
    // Print local network addresses for easy access during development
    const networkInterfaces = os.networkInterfaces();
    for (const name of Object.keys(networkInterfaces)) {
      for (const iface of networkInterfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`Backend accessible on: http://${iface.address}:${PORT}`);
        }
      }
    }
  });
  
  // Now try to initialize the database with enhanced schema
  try {
    console.log('Initializing and enhancing database schema...');
    const success = await setupDatabase();
    
    if (success) {
      console.log('Database setup completed successfully');
    }
  } catch (err) {
    console.error('WARNING: Database initialization failed:', err);
    console.log('Server is running, but database functionality may be limited.');
    console.log('Please check your database connection settings in .env file.');
  }
};

// Start the server
startServer();