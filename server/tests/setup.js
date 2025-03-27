/**
 * TigerType - Server Tests Setup
 * 
 * This file sets up the test environment for all server-side tests.
 */

// Set Jest timeout to 10 seconds
jest.setTimeout(10000);

// Set up mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001'; // Use a different port for tests
process.env.SESSION_SECRET = 'test-session-secret';

// Mock the database module
jest.mock('../db', () => ({
  query: jest.fn().mockImplementation((text, params) => {
    return Promise.resolve({ rows: [] });
  })
}));

// Silence console logs during tests if needed
// Uncomment this to disable console output during tests
/*
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
*/

// Global afterAll cleanup
afterAll(async () => {
  // Add cleanup code if needed
}); 