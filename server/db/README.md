# TigerType Database Setup
[AI DISCLAIMER: AI was used to help create the database doucmentation]

This directory contains the database setup scripts and models for the TigerType application.

## Database Schema

TigerType uses PostgreSQL to store user data, race results, and text snippets. The schema consists of the following tables:

- `users`: Princeton netIDs and statistics
- `snippets`: Text content for typing races
- `lobbies`: Race sessions (public or practice)
- `race_results`: Performance data for completed races
- `lobby_players`: Junction table for players in lobbies
- `user_sessions`: Stores user session data (managed by `connect-pg-simple`)
- `timed_leaderboard`: Tracks performance in timed typing tests
- `partial_sessions`: Records data from unfinished typing sessions when users restart

## Setup Instructions

1. Ensure PostgreSQL is installed and running on your system
2. Create a database for TigerType:
   ```sql
   CREATE DATABASE tigertype;
   ```
3. Set the database connection parameters in your `.env` file:
   ```
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_NAME=tigertype
   DB_PORT=5432
   ```

4. The server will automatically initialize the database when it starts. Alternatively, you can run the migrations manually:
   ```bash
   node server/db/migrations/run_migrations.js
   ```

## Database Structure

For full schema details, see `schema.sql`. Here's a brief overview:

### users
Stores Princeton netIDs, user statistics, and login timestamps.

### snippets
Stores text snippets that users will type, categorized by difficulty and theme.

### lobbies
Manages race sessions, including type (public/practice), status, and configuration.

### race_results
Records performance metrics for each race, including WPM, accuracy, and completion time.

### lobby_players
Tracks which users are in which lobbies and their ready status.

### user_sessions
Stores server-side session data for logged-in users. This table is automatically managed by the `connect-pg-simple` session store middleware used by Express. It typically includes a session ID (`sid`), session data (`sess` in JSON format), and an expiration timestamp (`expire`).

### timed_leaderboard
Tracks user performance in timed typing tests with different durations (15, 30, 60, 120 seconds).

### partial_sessions
Records data from typing sessions that were not completed (when a user presses TAB to restart or otherwise abandons a session). This allows for accurate tracking of total words typed and sessions started metrics.

## Working with Database Models

The application uses models to interact with the database. Here are the main models:

- `UserModel`: User operations and statistics
- `SnippetModel`: Text snippets and categories
- `RaceModel`: Race lobbies and results

Example usage:

```javascript
const UserModel = require('./models/user');
const user = await UserModel.findByNetid('abc123');
```

### User Model Extensions

The user model now includes additional methods for tracking detailed statistics:

```javascript
// Get detailed stats including words typed in unfinished sessions
const detailedStats = await UserModel.getDetailedStats(userId);
```

This returns statistics including:
- `sessions_started`: Total number of typing sessions initiated
- `sessions_completed`: Number of sessions completed
- `words_typed`: Total words typed across all sessions (including partial ones)
- `partial_sessions`: Number of unfinished/abandoned sessions

## Database Utility Functions

The database module (`db/index.js`) provides several utility functions:

- `initDB()`: Initialize the database and run migrations
- `seedTestData()`: Add sample data for testing
- Various functions for managing races and lobbies
- `insertTimedResult(userId, duration, wpm, accuracy)`: Record timed test results
- `getTimedLeaderboard(duration, period, limit)`: Get timed test leaderboards
- `getTotalPlatformStats()`: Get overall platform statistics
- `recordPartialSession(userId, sessionType, wordsTyped, charactersTyped)`: Record data from unfinished sessions
- `getTotalSessionsStarted()`: Get total number of started sessions (both completed and partial)

Example usage:

```javascript
const { recordPartialSession, getTotalPlatformStats } = require('../db');

// Record a partial session when user presses TAB to restart
await recordPartialSession(userId, 'snippet', 15, 75);

// Get platform-wide statistics for display
const stats = await getTotalPlatformStats();
console.log(`Total sessions started: ${stats.total_sessions_started}`);
console.log(`Total words typed: ${stats.total_words_typed}`);
```

## Migration System

The application uses a simple version-based migration system to manage database schema changes. Migrations are automatically applied when the server starts. Recent migrations include:

- Creation of the `timed_leaderboard` table for timed typing tests
- Creation of the `partial_sessions` table for tracking unfinished sessions

To add a new migration, add a new object to the migrations array in `db/migrations/index.js` with an incremented version number.