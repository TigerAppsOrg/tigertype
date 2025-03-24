const { Pool } = require('pg');

// Create a connection pool for Postgres
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tigertype',
  password: process.env.DB_PASSWORD || 'postgres',
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
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
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