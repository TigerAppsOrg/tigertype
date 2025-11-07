// minimal test sender using the same helpers as the API
require('dotenv').config();

const { sendFeedbackEmails } = require('../utils/email');

async function main() {
  const to = process.argv[2] || process.env.TEST_EMAIL_TO;
  const category = process.argv[3] || 'test';
  const message = process.argv[4] || 'this is a test message from tigertype test script';

  if (!to) {
    console.error('Usage: node server/scripts/test_feedback_email.js <recipient-email> [category] [message]');
    console.error('');
    console.error('Examples:');
    console.error('  node server/scripts/test_feedback_email.js ah0952@princeton.edu');
    console.error('  node server/scripts/test_feedback_email.js ah0952@princeton.edu bug');
    console.error('  node server/scripts/test_feedback_email.js ah0952@princeton.edu feature "I would like dark mode"');
    console.error('');
    console.error('Available categories: bug, feature, feedback, question, test');
    process.exit(1);
  }
  try {
    await sendFeedbackEmails({
      category,
      message,
      contactInfo: to,
      netid: null,
      userAgent: 'script',
      pagePath: '/test',
      createdAt: new Date(),
      // For this test script we force the acknowledgement to the provided email
      ackTo: to
    });
    console.log(`✓ Test email(s) sent successfully!`);
    console.log(`  Category: ${category}`);
    console.log(`  To: ${to}`);
    console.log(`  Message: "${message}"`);
  } catch (e) {
    console.error('✗ Send failed:', e.message);
    process.exit(2);
  }
}

main();
