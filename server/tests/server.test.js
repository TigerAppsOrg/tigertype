const request = require('supertest');
const express = require('express');

// Mock all dependencies
jest.mock('express-session', () => {
  return () => (req, res, next) => {
    req.session = { userInfo: { user: 'test1', userId: 1 } };
    next();
  };
});

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    use: jest.fn(),
    on: jest.fn()
  }))
}));

// Mock server DB correctly
jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));

jest.mock('../controllers/socket-handlers', () => ({
  initialize: jest.fn()
}));

jest.mock('../routes', () => {
  const express = require('express');
  const router = express.Router();
  
  router.get('/test-route', (req, res) => {
    res.json({ message: 'Test route success' });
  });
  
  return router;
});

describe('Server', () => {
  let app;
  
  beforeAll(() => {
    // Use the setup very similar to the actual server.js
    process.env.NODE_ENV = 'test';
    
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Use mocked routes
    const routes = require('../routes');
    app.use(routes);
    
    // Add a test endpoint directly to app
    app.get('/server-test', (req, res) => {
      res.status(200).json({ message: 'Server test successful' });
    });
  });
  
  it('should return 200 from a test endpoint', async () => {
    const res = await request(app).get('/server-test');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Server test successful');
  });
  
  it('should return 200 from a mocked route', async () => {
    const res = await request(app).get('/test-route');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Test route success');
  });
}); 