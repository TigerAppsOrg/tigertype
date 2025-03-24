# TigerType Database Setup

This directory contains the database setup scripts and models for the TigerType application.

## Database Schema

TigerType uses PostgreSQL to store user data, race results, and text snippets. The schema consists of the following tables:

- `users`: Princeton netIDs and statistics
- `snippets`: Text content for typing races
- `lobbies`: Race sessions (public or practice)
- `race_results`: Performance data for completed races
- `lobby_players`: Junction table for players in lobbies

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

## Utility Functions

The `db-helpers.js` module provides transaction-safe utility functions:

- `updateUserStats`: Recalculate user stats from race results
- `getLeaderboard`: Get top users by WPM
- `recordRaceResult`: Record a race result and update user stats in a single transaction

Example usage:

```javascript
const dbHelpers = require('./utils/db-helpers');
await dbHelpers.recordRaceResult({
  userId: 1,
  lobbyId: 123,
  snippetId: 5,
  wpm: 75.5,
  accuracy: 98.2,
  completionTime: 45.3
});
```