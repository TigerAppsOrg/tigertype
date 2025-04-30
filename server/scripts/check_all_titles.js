/**
 * Script to check and update titles for all users
 * Run with: node server/scripts/check_all_titles.js
 */

const { pool } = require('../config/database');
const User = require('../models/user');

async function checkAllTitles() {
  console.log('Starting title check for all users...');
  try {
    // Get all user IDs
    const result = await pool.query('SELECT id, netid FROM users');
    const users = result.rows;
    
    console.log(`Found ${users.length} users to check`);
    
    // Process each user
    for (const user of users) {
      console.log(`\n--- Checking titles for user ${user.id} (${user.netid}) ---`);
      
      // Get detailed stats
      const detailedStats = await User.getDetailedStats(user.id);
      console.log(`Stats: ${JSON.stringify(detailedStats)}`);
      
      if (detailedStats && detailedStats.sessions_started > 0) {
        const completionRate = (detailedStats.sessions_completed / detailedStats.sessions_started) * 100;
        console.log(`Completion rate: ${completionRate.toFixed(2)}% (${detailedStats.sessions_completed}/${detailedStats.sessions_started})`);
      }
      
      // Force check all titles for this user
      const titles = await User.forceCheckAllTitles(user.id);
      console.log(`User now has ${titles.length} titles: ${titles.map(t => t.name).join(', ')}`);
    }
    
    console.log('\nCompleted title check for all users');
  } catch (error) {
    console.error('Error checking titles:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
checkAllTitles(); 