// minimal test sender using the same helpers as the API
require('dotenv').config();

const { sendFeedbackEmails } = require('../utils/email');

async function main() {
  const to = process.argv[2] || process.env.TEST_EMAIL_TO;
  if (!to) {
    console.error('usage: node server/scripts/test_feedback_email.js <recipient-email>');
    process.exit(1);
  }
  try {
    await sendFeedbackEmails({
      category: 'test',
      message: 'this is a test message from tigertype test script',
      contactInfo: to,
      netid: null,
      userAgent: 'script',
      pagePath: '/test',
      createdAt: new Date()
    });
    console.log('test email(s) sent (ack + team)');
  } catch (e) {
    console.error('send failed', e);
    process.exit(2);
  }
}

main();

