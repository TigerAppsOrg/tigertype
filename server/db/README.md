# TigerType Database Setup
[AI DISCLAIMER: AI was used to help create the database doucmentation]

This directory contains the database setup scripts and models for the TigerType application.

## Database Schema (Overview)

TigerType uses PostgreSQL to store users, snippets, lobbies, race results, timed tests, partial sessions, plus badges and titles. For a full, live‑introspected description of every table, column, index, and relationship, see:

- `docs/DatabaseSchema.md` (includes a Mermaid ER diagram)

Schema highlights (tables):

- `users`: Princeton netIDs and stats (avg/fastest WPM, tutorial flag, selected title)
- `snippets`: Typing text, category, difficulty, counts, Princeton course fields
- `lobbies`: Race sessions (public/private/practice) with optional `snippet_id`
- `race_results`: Performance for each race
- `lobby_players`: Junction for players per lobby (ON DELETE CASCADE)
- `user_sessions`: Session store for Express (via connect-pg-simple)
- `timed_leaderboard`: Results for timed mode (15/30/60/120)
- `partial_sessions`: Words/characters typed in unfinished sessions
- `badges`, `user_badges`: Achievements and assignments
- `titles`, `user_titles`: Titles and assignments

Foreign key behavior (important):
- By default in your live DB, `lobbies.snippet_id` and `race_results.snippet_id` are NO ACTION. The repository includes a migration to change these to `ON DELETE SET NULL` for safe snippet deletion. Apply it with `npm run migrate`.

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

4. The server will automatically initialize the database when it starts. Or run migrations manually:
   ```bash
   npm run migrate
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

The application uses a version-based migration system (`server/db/migrations/index.js`). Run all pending migrations with:

```bash
npm run migrate
```

Recent/important migrations include:
- `timed_leaderboard` and indexes
- `partial_sessions` and index
- Princeton course fields on `snippets`
- `lobbies.version` for optimistic concurrency
- Badges/titles tables and `users.selected_title_id`
- Migration 18: change `lobbies.snippet_id` and `race_results.snippet_id` to `ON DELETE SET NULL` to make snippet deletion safe

To add a migration, append an object to the migrations array with an incremented `version`.

## Safe Snippet Deletion

Deleting a snippet may be blocked if it is referenced from `lobbies` or `race_results`. The repo includes both a migration and a script to make this easy:

1) Apply the FK changes (recommended)

```bash
npm run migrate
```

This sets `lobbies.snippet_id` and `race_results.snippet_id` to `ON DELETE SET NULL` so future deletes won’t fail.

2) Use the helper script to delete a snippet by ID

```bash
node server/db/scripts/delete_snippet.js 9
```

What it does (transactional):
- Finds a replacement snippet with same `category` and `difficulty` for active lobbies, and reassigns them; if none found, sets `snippet_id` to NULL.
- Sets `snippet_id` to NULL for any `race_results` rows referencing the snippet (also handled by FK once migration is applied).
- Deletes the snippet.

This ensures snippet removal is quick and safe, without hand-editing dependent rows.

### GitHub Action Workflow

You can delete a snippet without cloning the repo by using the manual workflow:

- Workflow: `.github/workflows/delete-snippet.yml`
- Trigger: GitHub → Actions → “Delete Snippet(s)” → “Run workflow”
- Inputs:
  - `snippet_ids` (required): One or more IDs, comma or space separated. Examples: `9`, `9, 19, 30`, `9 19 30`
  - `environment` (optional): `production` (default) or `staging`
- Secrets:
  - Configure `DATABASE_URL` as a repo secret or an environment-level secret (for the chosen environment). The workflow sets `NODE_ENV=production` so the Node DB client uses `DATABASE_URL` with SSL.

### Local Multi-Delete

You can also delete multiple IDs locally without re-running the command:

```bash
node server/db/scripts/delete_snippet.js 9 19 30
# or comma-separated
node server/db/scripts/delete_snippet.js "9,19,30"
```

## ER Diagram

See the complete Mermaid ER diagram in `docs/DatabaseSchema.md`.
