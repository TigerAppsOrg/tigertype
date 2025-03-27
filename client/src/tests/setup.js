/**
 * TigerType - Client Tests Setup
 * 
 * This file sets up the test environment for all client-side tests.
 */

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { setupServer } from 'msw/node';

// Extend Vitest's expect with Jest DOM matchers
expect.extend(matchers);

// Automatically clear mocks and cleanup after each test
afterEach(() => {
  cleanup();
});

// Create MSW server for mocking API calls
export const server = setupServer();

// Start the MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close the server after all tests
afterAll(() => server.close());

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const socket = {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
  return {
    io: {
      connect: vi.fn(() => socket),
    },
    default: {
      connect: vi.fn(() => socket),
    },
  };
}); 