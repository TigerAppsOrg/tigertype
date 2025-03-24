const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const os = require('os');
const session = require('express-session');
const path = require('path');
const socketHandler = require('./server/controllers/socket-handlers');
const { casAuth, isAuthenticated, logoutApp, logoutCAS } = require('./server/utils/auth');

const PORT = process.env.PORT || 3000;

// configure session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'tigertype-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 24 * 60 * 60 * 1000 // 24h
  }
});

// use session middleware for Express
app.use(sessionMiddleware);

// parse JSON + URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// auth routes
app.get('/auth/status', (req, res) => {
  res.json({
    authenticated: isAuthenticated(req),
    user: req.session.userInfo || null
  });
});
app.get('/auth/logout', logoutApp);
app.get('/auth/logoutcas', logoutCAS);

// serve static assets (except index.html) from public
app.use(express.static(path.join(__dirname, 'public'), {
  index: false // Don't serve index.html automatically
}));

// protected main route - require CAS
app.get('/', casAuth, (req, res) => {
  // after successful auth, serve the index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// share session w Express and Socket.IO
io.use((socket, next) => {
  // clone the Express session middleware for Socket.IO
  sessionMiddleware(socket.request, {}, next);
});

// add user info middleware for socket connections
io.use((socket, next) => {
  const req = socket.request;
  
  // if user isn't auth, reject the socket connection
  if (!isAuthenticated(req)) {
    return next(new Error('Authentication required'));
  }
  
  // add user info to socket for handlers
  socket.userInfo = req.session.userInfo;
  
  // store original socket.emit function
  const originalEmit = socket.emit;
  
  // ovveride emit to add CAS auth info to 'connected' events
  socket.emit = function(event, ...args) {
    if (event === 'connected') {
      const data = args[0] || {};
      data.casAuthenticated = true;
      data.netid = socket.userInfo.user;
      return originalEmit.call(this, event, data, ...args.slice(1));
    }
    return originalEmit.apply(this, [event, ...args]);
  };
  
  next();
});

// init socket handler with io instance
socketHandler.initialize(io);

http.listen(PORT, () => {
  console.log('Server listening on *:' + PORT);
  const networkInterfaces = os.networkInterfaces();
  for (const name of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`Accessible on: http://${iface.address}:${PORT}`);
      }
    }
  }
});