# TigerType Development Guidelines

## Build & Run Commands
- `npm run dev` - Run both server and client in development mode
- `npm run test` - Run all server tests
- `npm run test:server` - Run only server tests
- `npm run test:client` - Run client tests
- `npm run test:client:watch` - Run client tests in watch mode
- `npm run test:client:progress` - Run client tests with visual progress output
- `npm run lint` - Run ESLint to check client code

## Test Commands
- Test a specific server file: `jest --config jest.config.js <path/to/test.js>`
- Test a specific client test: `cd client && npx vitest run <path/to/test.jsx>`

## Code Style
- Use React functional components with hooks
- React imports: group by context/components/pages
- Component props should use PropTypes validation
- Prefer destructuring for props and state
- Use lazy loading for page components
- Follow existing error handling patterns with try/catch blocks
- Use camelCase for variables/functions, PascalCase for components
- Organize imports: React, third-party, local components, styles
- Prefer async/await over promise chains