# TigerType Project Guidelines

## Build and Run Commands
- Install dependencies: `npm install`
- Start development server: `npm run dev` or `node server.js`
- Production start: `npm start`
- Lint code: `npm run lint`
- Run tests: `npm test`
- Run single test: `npm test -- -t "test name"`

## Code Style Guidelines
- **Formatting**: Use 2-space indentation, semicolons, single quotes
- **Naming**: camelCase for variables/functions, PascalCase for classes/components
- **Imports**: Group imports (1. node modules, 2. local modules, 3. CSS/assets)
- **Error Handling**: Use try/catch for async operations, log meaningful errors
- **Types**: Use JSDoc comments for type documentation
- **Folders**: Features-based organization (controllers, utils, models, views)
- **API Endpoints**: RESTful conventions with descriptive names
- **Socket Events**: Use verb-noun format (e.g., 'race:start', 'user:joined')
- **Component Structure**: Separate logic from presentation when possible
- **Authentication**: Always verify session in protected routes and socket connections