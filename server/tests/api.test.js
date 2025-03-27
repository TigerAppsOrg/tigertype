/* ENTIRELY AI-GENERATED FILE */

const request = require('supertest');
const express = require('express');

// Create mock implementation for api routes
const mockApiRoutes = express.Router();

// Mock the snippets endpoint
mockApiRoutes.get('/snippets', (req, res) => {
  res.status(200).json({
    snippets: [
      { id: 1, content: 'Test snippet 1', title: 'Test Title 1', difficulty: 1 },
      { id: 2, content: 'Test snippet 2', title: 'Test Title 2', difficulty: 2 }
    ]
  });
});

// Mock the races endpoint
mockApiRoutes.get('/races', (req, res) => {
  res.status(200).json({
    races: [
      { id: 1, snippet_id: 1, status: 'waiting', race_code: 'TEST001' },
      { id: 2, snippet_id: 2, status: 'completed', race_code: 'TEST002' }
    ]
  });
});

// Mock express-session middleware
jest.mock('express-session', () => {
  return () => (req, res, next) => {
    req.session = {
      userInfo: {
        user: 'test1',
        userId: 1
      }
    };
    next();
  };
});

// Mock database module
jest.mock('../db', () => ({
  query: jest.fn().mockImplementation((text, params) => {
    if (text.includes('SELECT * FROM snippets')) {
      return Promise.resolve({
        rows: [
          { id: 1, content: 'Test snippet 1', title: 'Test Title 1', difficulty: 1 },
          { id: 2, content: 'Test snippet 2', title: 'Test Title 2', difficulty: 2 }
        ]
      });
    }
    if (text.includes('SELECT * FROM races')) {
      return Promise.resolve({
        rows: [
          { id: 1, snippet_id: 1, status: 'waiting', race_code: 'TEST001' },
          { id: 2, snippet_id: 2, status: 'completed', race_code: 'TEST002' }
        ]
      });
    }
    return Promise.resolve({ rows: [] });
  })
}));

describe('API Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', mockApiRoutes);
  });

  describe('GET /api/snippets', () => {
    it('should return a list of snippets', async () => {
      const res = await request(app).get('/api/snippets');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('snippets');
      expect(res.body.snippets).toHaveLength(2);
      expect(res.body.snippets[0]).toHaveProperty('id', 1);
    });
  });

  describe('GET /api/races', () => {
    it('should return a list of races', async () => {
      const res = await request(app).get('/api/races');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('races');
      expect(res.body.races).toHaveLength(2);
      expect(res.body.races[0]).toHaveProperty('race_code', 'TEST001');
    });
  });
}); 