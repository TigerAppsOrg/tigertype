/**
 * API Test Utilities
 * 
 * This file provides utilities for testing API calls in the client.
 */

import { rest } from 'msw';
import { server } from '../setup';

// Constants
export const API_BASE_URL = '/api';

// Set up MSW handlers for API mocking
export const setupApiMocks = (handlers) => {
  server.use(...handlers);
};

// Helper to create a successful API response
export const createSuccessResponse = (data) => {
  return { success: true, ...data };
};

// Helper to create an error API response
export const createErrorResponse = (message, status = 400) => {
  return { success: false, error: message, status };
};

// Common API handlers for testing
export const commonHandlers = [
  // GET /api/snippets
  rest.get(`${API_BASE_URL}/snippets`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse({
        snippets: [
          { id: 1, content: 'Test snippet 1', title: 'Test Title 1', difficulty: 1 },
          { id: 2, content: 'Test snippet 2', title: 'Test Title 2', difficulty: 2 }
        ]
      }))
    );
  }),
  
  // GET /api/races
  rest.get(`${API_BASE_URL}/races`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse({
        races: [
          { id: 1, snippet_id: 1, status: 'waiting', race_code: 'TEST001' },
          { id: 2, snippet_id: 2, status: 'completed', race_code: 'TEST002' }
        ]
      }))
    );
  }),
  
  // POST /api/races
  rest.post(`${API_BASE_URL}/races`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json(createSuccessResponse({
        race: { 
          id: 3, 
          snippet_id: req.body.snippetId || 1, 
          status: 'waiting', 
          race_code: 'NEW123' 
        }
      }))
    );
  }),
  
  // GET /api/user/stats
  rest.get(`${API_BASE_URL}/user/stats`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse({
        stats: {
          races_completed: 10,
          best_wpm: 120,
          average_wpm: 85.5,
          average_accuracy: 95.2
        }
      }))
    );
  })
]; 