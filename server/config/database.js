const { Pool } = require('pg');

// Log database connection details (excluding password)
console.log('Connecting to database with settings:');
console.log(`  User: ${process.env.DB_USER}`);
console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`  Database: ${process.env.DB_NAME || 'tigertype'}`);
console.log(`  Port: ${process.env.DB_PORT || 5432}`);

// Create a connection pool for Postgres
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tigertype',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
  // Connection timeout of 30 seconds
  connectionTimeoutMillis: 30000,
  // Idle timeout of 10 seconds
  idleTimeoutMillis: 10000,
  // Max clients in the pool
  max: 20
});

// Event listener for connection errors
pool.on('error', (err) => {
  console.error('Database connection error:', err);
  console.log('WARNING: Database connection issue detected.');
  // Not exiting process so the server can continue running even with DB issues
});

// Helper to run a query with error handling
const query = async (text, params) => {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (over 100ms)
    if (duration > 100) {
      console.log('Slow query:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
};

// Helper to get a client from the pool for transactions
const getClient = async () => {
  const client = await pool.connect();
  const originalRelease = client.release;
  
  // Override the release method to log duration
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