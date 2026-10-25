const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(path.join(__dirname, 'queries/daily-active-users.sql'), 'utf8');

async function publishDailyActiveUsers({ pool, cloudwatch }) {
  const { rows: [row] } = await pool.query(sql);
  const value = Number(row.value);
  const timestamp = new Date(row.timestamp);
  if (!Number.isSafeInteger(value) || value < 0 || Number.isNaN(timestamp.getTime())) {
    throw new Error('Invalid daily active users query result');
  }
  const data = {
    Namespace: 'TigerType',
    MetricData: [{
      MetricName: 'DailyActiveUsers',
      Unit: 'Count',
      Value: value,
      Timestamp: timestamp
    }]
  };
  await cloudwatch.putMetricData(data).promise();
  console.log(`Published: DailyActiveUsers=${value} for ${row.day}`);
  return data;
}

async function main() {
  require('dotenv').config();
  const AWS = require('aws-sdk');
  const { pool } = require('../server/config/database');
  try {
    const cloudwatch = new AWS.CloudWatch({
      region: process.env.CLOUDWATCH_REGION || 'us-east-1',
      httpOptions: { connectTimeout: 5000, timeout: 30000 },
      maxRetries: 2
    });
    await publishDailyActiveUsers({
      pool,
      cloudwatch
    });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(error => {
    const details = [error, ...(error.errors || [])]
      .map(err => [err.code, err.message].filter(Boolean).join(': '))
      .filter(Boolean).join('; ');
    console.error('Daily active users publication failed:', details || error.name);
    process.exitCode = 1;
  });
}

module.exports = { publishDailyActiveUsers };
