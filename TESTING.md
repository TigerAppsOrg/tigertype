# TigerType Testing Guide
**[ALL TESTS ARE ENTIRELY AI-GENERATED]**
*(THIS INCLUDES ALL TEST RELATED FILES: this `TESTING.md` file, all files in the `testing/` directory, and the run-tests.sh script)*

This document provides instructions for running and writing tests for the TigerType application.

## Setting Up Pre-Commit Tests

Before you can commit changes, you need to set up the pre-commit hook that runs tests automatically:

### For New Developers
1. Clone the repository
2. Make the pre-commit hook executable:
   ```bash
   # On macOS/Linux:
   chmod +x .git/hooks/pre-commit
   
   # On Windows (using Git Bash):
   chmod +x .git/hooks/pre-commit
   
   # On Windows (using PowerShell):
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### For Existing Developers
1. Pull the latest changes from master
2. Make the pre-commit hook executable:
   ```bash
   # On macOS/Linux:
   chmod +x .git/hooks/pre-commit
   
   # On Windows (using Git Bash):
   chmod +x .git/hooks/pre-commit
   
   # On Windows (using PowerShell):
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
   ```
3. Install any new dependencies:
   ```bash
   npm install
   ```

After setup, the pre-commit hook will automatically run server tests before each commit. Client tests are skipped in the local environment but will run in CI.

## Running Tests

We've provided a convenient script to run tests with a nice UI:

```bash
./run-tests.sh
```

This will give you options to run all tests, server tests only, or client tests only. You can also choose options with progress bars for better visualization.

### Alternative Commands

You can also run the tests directly with npm:

```bash
# Run all tests
npm run test:all

# Run all tests with progress bars
npm run test:all:pretty

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client

# Run client tests with progress bar
npm run test:client:progress
```

### Test with Coverage

To generate test coverage reports:

```bash
# Server coverage
npm test -- --coverage

# Client coverage
cd client && npm run test:coverage
```

## Test Structure

The tests are organized as follows:

### Server Tests

Located in the `server/tests` directory:

- `server/tests/models/`: Tests for database models
- `server/tests/api.test.js`: Tests for API endpoints
- `server/tests/server.test.js`: Tests for the server

### Client Tests

Located in the `client/src/tests` directory:

- `client/src/tests/components/`: Tests for React components
- `client/src/tests/utils/`: Tests for utility functions
- `client/src/tests/mocks/`: Mock implementations for testing

## Writing New Tests

### Server Tests
Server tests use Jest and Supertest. To create a new test:

1. Create a new file ending with `.test.js` in the appropriate directory
2. Import necessary dependencies
3. Use `describe` to group related tests
4. Use `it` or `test` for individual test cases
5. Use `expect` for assertions

Example:

```javascript
const SomeModel = require('../../models/some-model');

describe('Some Model', () => {
  it('should do something correctly', async () => {
    const result = await SomeModel.someFunction();
    expect(result).toBeDefined();
    expect(result).toHaveProperty('id');
  });
});
```

### Client Tests

Client tests use Vitest and React Testing Library. To create a new test:

1. Create a new file ending with `.test.jsx` in the appropriate directory
2. Import necessary dependencies including any required mocks
3. Use `describe` to group related tests
4. Use `it` or `test` for individual test cases
5. Use `expect` for assertions

Example:

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SomeComponent from '../../components/SomeComponent';
import { MockSomeProvider } from '../mocks/mockContexts';

describe('Some Component', () => {
  it('renders correctly', () => {
    render(
      <MockSomeProvider>
        <SomeComponent />
      </MockSomeProvider>
    );
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Mocking

### Mocking Server Dependencies

In server tests, we mock the database and other dependencies using Jest:

```javascript
// Mock database module
jest.mock('../../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));

// Mock model methods
const mockModel = {
  findById: jest.fn().mockResolvedValue({ id: 1, name: 'Test' })
};
Object.assign(ActualModel, mockModel);
```

### Mocking Client Dependencies

In client tests, we mock dependencies using Vitest:

```javascript
import { vi } from 'vitest';

// Mock a module directly
vi.mock('../../context/SomeContext', () => ({
  useSomeContext: () => ({
    someState: 'mocked value',
    someFunction: vi.fn()
  })
}));

// Or use our pre-built mock providers
import { MockSomeProvider } from '../mocks/mockContexts';

render(
  <MockSomeProvider value={{ customValue: true }}>
    <ComponentToTest />
  </MockSomeProvider>
);
```

## Before Submitting a PR

Before submitting a PR, ensure all tests pass:

1. Run `./run-tests.sh` and select option 1 or 2 (All Tests)
2. Fix any failing tests
3. Write new tests for your added functionality

## Best Practices

1. Each test should be independent and not rely on the state from previous tests
2. Tests should be fast and not rely on external services
3. Use meaningful test names that describe what you're testing
4. Try to follow the Arrange-Act-Assert pattern
5. Mock external dependencies to isolate your tests
6. Keep tests maintainable by avoiding excessive stubbing
