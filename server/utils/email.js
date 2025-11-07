// SMTP OAuth (delegated) using MSAL public client + token cache
const { PublicClientApplication } = require('@azure/msal-node');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const firstEnv = (...keys) => {
  for (const k of keys) {
    if (process.env[k]) return process.env[k];
  }
  return undefined;
};

const smtpUser = firstEnv('SMTP_SENDER', 'GRAPH_SENDER_USER', 'FEEDBACK_EMAIL_FROM') || 'cs-tigertype@princeton.edu';
const tenantId = firstEnv('AZURE_TENANT_ID', 'TENANT_ID');
const clientId = firstEnv('AZURE_CLIENT_ID', 'CLIENT_ID');

// token cache persistence
const CACHE_ENV = 'SMTP_OAUTH_CACHE';
const CACHE_PATH = process.env.SMTP_OAUTH_CACHE_PATH || path.join(__dirname, '..', '.smtp_oauth_cache.json');

const tokenCachePlugin = {
  beforeCacheAccess: async (context) => {
    try {
      const envJson = process.env[CACHE_ENV];
      if (envJson) {
        context.tokenCache.deserialize(envJson);
        return;
      }
      if (fs.existsSync(CACHE_PATH)) {
        const data = fs.readFileSync(CACHE_PATH, 'utf-8');
        context.tokenCache.deserialize(data);
      }
    } catch (_) {}
  },
  afterCacheAccess: async (context) => {
    if (context.cacheHasChanged) {
      try {
        fs.writeFileSync(CACHE_PATH, context.tokenCache.serialize(), 'utf-8');
      } catch (_) {}
    }
  }
};

const pca = new PublicClientApplication({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`
  },
  cache: { cachePlugin: tokenCachePlugin }
});

const SMTP_SCOPES = ['https://outlook.office365.com/SMTP.Send', 'offline_access', 'openid', 'email'];

async function getSmtpAccessToken() {
  const accounts = await pca.getTokenCache().getAllAccounts();
  if (accounts && accounts.length > 0) {
    try {
      const result = await pca.acquireTokenSilent({ scopes: SMTP_SCOPES, account: accounts[0] });
      return result.accessToken;
    } catch (_) {
      // fall through to device code seed requirement
    }
  }
  throw new Error('No delegated SMTP token available. Run: node server/scripts/seed_smtp_oauth_device_login.js');
}

const sendMailGeneric = async ({ to, from, subject, text, replyTo }) => {
  if (!tenantId || !clientId) throw new Error('Missing AZURE_TENANT_ID/AZURE_CLIENT_ID');
  const accessToken = await getSmtpAccessToken();
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      type: 'OAuth2',
      user: smtpUser,
      accessToken
    }
  });
  const mail = { from, to, subject, text };
  if (replyTo) mail.replyTo = replyTo;
  await transporter.sendMail(mail);
};

const sendFeedbackNotification = async ({
  category,
  message,
  contactInfo,
  netid,
  userAgent,
  pagePath,
  createdAt,
  to,
  from
}) => {
  const fromAddr = from || process.env.FEEDBACK_EMAIL_FROM || process.env.GRAPH_SENDER_USER || 'cs-tigertype@princeton.edu';

  const subject = `[TigerType Feedback] ${category.toUpperCase()} from ${netid || 'anonymous user'}`;

  const lines = [
    `Category: ${category}`,
    `Submitted: ${createdAt.toISOString()}`,
    `NetID: ${netid || 'anonymous'}`,
    `Contact: ${contactInfo || 'not provided'}`,
    `Page: ${pagePath || 'unknown'}`,
    '',
    'Message:',
    message,
    '',
    '---',
    `User Agent: ${userAgent || 'unknown'}`
  ];

  // set replyTo to contact email if valid so team can reply directly to user
  let replyTo = undefined;
  if (contactInfo && emailRe.test(contactInfo)) {
    const m = contactInfo.match(emailRe);
    if (m) replyTo = m[0];
  }

  await sendMailGeneric({ to, from: fromAddr, subject, text: lines.join('\n'), replyTo });
};

// quick email regex
const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const deriveUserEmail = (contactInfo, netid) => {
  if (contactInfo && emailRe.test(contactInfo)) {
    const m = contactInfo.match(emailRe);
    if (m) return m[0];
  }
  if (netid && /^[a-z0-9._-]+$/i.test(netid)) {
    return `${netid}@princeton.edu`;
  }
  return null;
};

const sendFeedbackAcknowledgement = async ({
  to,
  from,
  category,
  message,
  contactInfo,
  pagePath,
  createdAt
}) => {
  if (!to) return;
  const subject = 'thanks for your feedback to tigertype';
  const lines = [
    'hi there — thanks for sending feedback to tigertype',
    '',
    `we received your ${category || 'feedback'} and will look into it shortly`,
    '',
    'summary',
    `submitted: ${createdAt.toISOString()}`,
    pagePath ? `page: ${pagePath}` : null,
    contactInfo ? `contact: ${contactInfo}` : null,
    '',
    'message',
    message,
    '',
    '— tigertype team'
  ].filter(Boolean);
  await sendMailGeneric({ from, to, subject, text: lines.join('\n') });
};

const sendFeedbackEmails = async ({
  category,
  message,
  contactInfo,
  netid,
  userAgent,
  pagePath,
  createdAt
}) => {
  const from = process.env.FEEDBACK_EMAIL_FROM || process.env.GRAPH_SENDER_USER || 'cs-tigertype@princeton.edu';
  const teamList = (process.env.FEEDBACK_EMAIL_TO_TEAM || 'cs-tigertype@princeton.edu,it.admin@tigerapps.org')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const toUser = deriveUserEmail(contactInfo, netid);

  // send acknowledgement first; if it fails, throw
  if (toUser) {
    await sendFeedbackAcknowledgement({
      to: toUser,
      from,
      category,
      message,
      contactInfo,
      pagePath,
      createdAt
    });
  }

  // send to each team recipient; if all fail, throw
  let sentAny = false;
  for (const teamTo of teamList) {
    try {
      await sendFeedbackNotification({
        category,
        message,
        contactInfo,
        netid,
        userAgent,
        pagePath,
        createdAt,
        to: teamTo,
        from
      });
      sentAny = true;
    } catch (e) {
      // continue to next recipient
    }
  }
  if (teamList.length > 0 && !sentAny) {
    throw new Error('failed to send to all team recipients');
  }
};

module.exports = {
  sendFeedbackNotification,
  sendFeedbackEmails
};
