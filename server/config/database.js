const { Pool } = require('pg');

// Check for database URL (used in production)
const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

// Log database connection details
console.log('Connecting to database in', isProduction ? 'PRODUCTION' : 'DEVELOPMENT', 'mode');

if (isProduction && connectionString) {
  console.log('Using database connection string from DATABASE_URL');
} else {
  console.log(`  User: ${process.env.DB_USER}`);
  console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  Database: ${process.env.DB_NAME || 'tigertype'}`);
  console.log(`  Port: ${process.env.DB_PORT || 5432}`);
}

// Configure database pool
let poolConfig;

if (isProduction && connectionString) {
  // Production configuration using connection string
  poolConfig = {
    connectionString,
    ssl: {
      rejectUnauthorized: false // Required for Heroku PostgreSQL
    },
    // Increase connection timeout to 60 seconds
    connectionTimeoutMillis: 60000,
    // Reduce idle timeout to prevent connections from staying open too long
    idleTimeoutMillis: 5000,
    // Half of heroku's updated capacity
    max: 20,
    // Add min to ensure pool is properly initialized
    min: 2,
    // Add statement timeout to prevent long-running queries
    statement_timeout: 30000,
    timezone: 'America/New_York'
  };
} else {
  // Development configuration using individual parameters
  poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'tigertype',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
    // Increase connection timeout to 60 seconds
    connectionTimeoutMillis: 60000,
    // Reduce idle timeout to prevent connections from staying open too long
    idleTimeoutMillis: 5000,
    // Set max clients to match Heroku upgraded plan capacity (half of 40 limit)
    max: 20,
    // Add min to ensure pool is properly initialized
    min: 2,
    // Add statement timeout to prevent long-running queries
    statement_timeout: 30000,
    timezone: 'America/New_York'
  };
}

// Create a connection pool for Postgres
const pool = new Pool(poolConfig);

// Set timezone for each client when it's acquired from the pool
pool.on('connect', async (client) => {
  try {
    await client.query('SET timezone = "America/New_York"');
  } catch (err) {
    console.error('Error setting timezone:', err);
  }
});

// Event listener for connection errors
pool.on('error', (err) => {
  console.error('Database connection error:', err);
  console.log('WARNING: Database connection issue detected.');
  // Not exiting process so the server can continue running even with DB issues
});

// Event listener for pool creation (helpful for debugging)
pool.on('connect', () => {
  console.debug('New database connection established');
});

// Event listener for connection release
pool.on('release', () => {
  console.debug('Database connection released back to pool');
});

// Helper to run a query with error handling
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (over 100ms)
    if (duration > 100) {
      console.log('Slow query:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  } finally {
    // Ensure connection is always released back to the pool
    client.release();
  }
};

// Helper to get a client from the pool for transactions
const getClient = async () => {
  const client = await pool.connect();
  const originalRelease = client.release;
  
  // Override the release method to log duration and ensure proper release
  client.release = () => {
    client.query_count = 0;
    originalRelease.apply(client);
  };
  
  return client;
};

module.exports = {
  query,
  getClient,
  pool
};