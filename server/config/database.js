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
    // Connection timeout of.30 seconds
    connectionTimeoutMillis: 30000,
    // Idle timeout of 10 seconds
    idleTimeoutMillis: 10000,
    // Max clients in the pool
    max: 20,
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
    // Connection timeout of 30 seconds
    connectionTimeoutMillis: 30000,
    // Idle timeout of 10 seconds
    idleTimeoutMillis: 10000,
    // Max clients in the pool
    max: 20,
    timezone: 'America/New_York'
  };
}

// Create a connection pool for Postgres
const pool = new Pool(poolConfig);

// Set timezone for each client when it's acquired from the pool
pool.on('connect', async (client) => {
  try {
    await client.query('SET timezone = "America/New_York"');
    console.log('Timezone set to America/New_York (EST)');
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

// Monitor pool status
const getPoolStatus = () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: poolConfig.max
  };
};

// Check if pool is nearing capacity
const isPoolNearingCapacity = () => {
  const status = getPoolStatus();
  return status.total >= status.max * 0.8; // Warning at 80% capacity
};

// Log pool status periodically in production
if (isProduction) {
  setInterval(() => {
    const status = getPoolStatus();
    console.log(`[DB Pool] Status: ${status.total}/${status.max} connections (${status.idle} idle, ${status.waiting} waiting)`);
    
    if (isPoolNearingCapacity()) {
      console.warn(`[DB Pool] WARNING: Nearing capacity (${status.total}/${status.max}) - possible connection leak`);
    }
  }, 60000); // Log every minute
}

module.exports = {
  query,
  getClient,
  pool,
  getPoolStatus,
  isPoolNearingCapacity
};