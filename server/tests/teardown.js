const { pool } = require('../config/database');

module.exports = async () => {
  await pool.end();
}; 