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

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configure session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'tigertype-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 24 * 60 * 60 * 1000 // 24h
  }
});

// Use session middleware for Express
app.use(sessionMiddleware);

// Parse JSON + URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Remove duplicate auth routes since they're defined in the routes module
// with proper CAS authentication

// Serve static assets from public
app.use(express.static(path.join(__dirname, 'public')));

// Use main routes
app.use(routes);

// Share session between Express and Socket.io
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Socket authentication middleware
io.use(async (socket, next) => {
  const req = socket.request;
  
  // If user isn't authenticated, reject the socket connection
  if (!isAuthenticated(req)) {
    return next(new Error('Authentication required'));
  }
  
  try {
    // Get the netid from session
    const netid = req.session.userInfo.user;
    
    // Make sure we have a valid netid
    if (!netid) {
      return next(new Error('Invalid authentication: Missing netid'));
    }
    
    // Ensure user exists in database
    const UserModel = require('./server/models/user');
    const user = await UserModel.findOrCreate(netid);
    
    // If we couldn't create a user, reject the connection
    if (!user) {
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
    console.log('TigerType server listening on *:' + PORT);
    
    // Print local network addresses for easy access during development
    const networkInterfaces = os.networkInterfaces();
    for (const name of Object.keys(networkInterfaces)) {
      for (const iface of networkInterfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`Accessible on: http://${iface.address}:${PORT}`);
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