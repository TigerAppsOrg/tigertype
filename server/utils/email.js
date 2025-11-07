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

const smtpUser = firstEnv('SMTP_SENDER', 'GRAPH_SENDER_USER', 'FEEDBACK_EMAIL_FROM');
const tenantId = firstEnv('AZURE_TENANT_ID', 'TENANT_ID');
const clientId = firstEnv('AZURE_CLIENT_ID', 'CLIENT_ID');
const siteUrl = process.env.SITE_URL || 'https://tigertype.tigerapps.org';

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

// Lazily create MSAL PCA only if SMTP OAuth is configured
let pca = null;
function getPcaInstance() {
  if (!tenantId || !clientId) return null;
  if (!pca) {
    try {
      pca = new PublicClientApplication({
        auth: {
          clientId,
          authority: `https://login.microsoftonline.com/${tenantId}`
        },
        cache: { cachePlugin: tokenCachePlugin }
      });
    } catch (e) {
      // If MSAL fails to construct (e.g., bad/missing config), treat as unconfigured
      console.warn('msal init failed; feedback email disabled until configured:', e && e.message ? e.message : e);
      pca = null;
      return null;
    }
  }
  return pca;
}

const SMTP_SCOPES = ['https://outlook.office365.com/SMTP.Send', 'offline_access', 'openid', 'email'];

async function getSmtpAccessToken() {
  const app = getPcaInstance();
  if (!app) {
    throw new Error('SMTP OAuth not configured');
  }
  const accounts = await app.getTokenCache().getAllAccounts();
  if (accounts && accounts.length > 0) {
    try {
      const result = await app.acquireTokenSilent({ scopes: SMTP_SCOPES, account: accounts[0] });
      return result.accessToken;
    } catch (_) {
      // fall through to device code seed requirement
    }
  }
  throw new Error('No delegated SMTP token available. Run: node server/scripts/seed_smtp_oauth_device_login.js');
}

const sendMailGeneric = async ({ to, from, subject, text, html, replyTo, cc, attachments }) => {
  if (!tenantId || !clientId) {
    console.warn('feedback email disabled: missing AZURE_TENANT_ID/AZURE_CLIENT_ID (skipping send)');
    return;
  }
  if (!from || !smtpUser) {
    console.warn('feedback email disabled: missing From or SMTP user (skipping send)');
    return;
  }
  let accessToken;
  try {
    accessToken = await getSmtpAccessToken();
  } catch (e) {
    console.warn('smtp oauth token unavailable; skipping send. seed with device code script.', e && e.message ? e.message : e);
    return;
  }
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
  if (html) mail.html = html;
  if (replyTo) mail.replyTo = replyTo;
  if (cc) mail.cc = cc;
  if (!attachments) attachments = getLogoAttachment();
  if (attachments && attachments.length) mail.attachments = attachments;
  await transporter.sendMail(mail);
};

// quick email regex (declare early for clarity)
const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const sendFeedbackNotification = async ({
  category,
  message,
  contactInfo,
  netid,
  userAgent,
  pagePath,
  createdAt,
  to,
  from,
  cc
}) => {
  const fromAddr = from || process.env.FEEDBACK_EMAIL_FROM;

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

  // set replyTo to contact email if present so team can reply directly to user
  let replyTo = undefined;
  const mReply = contactInfo?.match(emailRe);
  if (mReply) replyTo = mReply[0];

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:720px;margin:0 auto;padding:32px 24px;color:#333;background:#ffffff;">
    <div style=\"margin:0 0 32px 0;text-align:left;\">
      <a href=\"${siteUrl}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"display:inline-block;\">
        <img src=\"cid:tt-logo\" alt=\"TigerType\" height=\"56\" style=\"display:block;border:none;\"/>
      </a>
    </div>
    <h3 style=\"margin:0 0 16px 0;color:#F58025;font-weight:800;font-size:24px;line-height:1.2;\">New ${escapeHtml(category)} submitted</h3>
    <ul style=\"margin:0 0 24px 0;padding:0 0 0 20px;font-size:15px;line-height:1.8;color:#555;\">
      <li><strong>Submitted:</strong> ${escapeHtml(createdAt.toISOString())}</li>
      <li><strong>NetID:</strong> ${escapeHtml(netid || 'anonymous')}</li>
      <li><strong>Contact:</strong> ${escapeHtml(contactInfo || 'not provided')}</li>
      <li><strong>Page:</strong> ${escapeHtml(pagePath || 'unknown')}</li>
      <li><strong>User Agent:</strong> ${escapeHtml(userAgent || 'unknown')}</li>
    </ul>
    <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;margin:0 0 24px 0;border-collapse:separate;border-spacing:0;\">
      <tr>
        <td style=\"background:#f8f8f8;border-left:4px solid #F58025;border-radius:6px;padding:16px 20px;\">
          <div style=\"font-weight:700;margin:0 0 10px 0;font-size:15px;color:#333;\">Message</div>
          <div style=\"white-space:pre-wrap;line-height:1.6;color:#555;font-size:15px;\">${escapeHtml(message || '')}</div>
        </td>
      </tr>
    </table>
    <hr style=\"border:none;border-top:1px solid #e0e0e0;margin:32px 0 16px 0;\"/>
    <p style=\"margin:0;font-size:13px;color:#999;text-align:center;\">Reply to this email to respond directly to the user.</p>
  </div>`;

  await sendMailGeneric({ to, from: fromAddr, subject, text: lines.join('\n'), html, replyTo, cc });
};

const deriveUserEmail = (contactInfo, netid) => {
  const m = contactInfo?.match(emailRe);
  if (m) return m[0];
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
  const subject = 'Thanks for your feedback to TigerType';
  const submittedLocal = (createdAt instanceof Date ? createdAt : new Date(createdAt))
    .toLocaleString('en-US', { timeZone: 'America/New_York' });
  const safeMessage = (message || '').trim();
  const summaryRows = [
    pagePath ? `<li><strong>Page:</strong> ${escapeHtml(pagePath)}</li>` : '',
    contactInfo ? `<li><strong>Contact:</strong> <a href=\"mailto:${escapeAttr(contactInfo)}\">${escapeHtml(contactInfo)}</a></li>` : '',
    `<li><strong>Submitted:</strong> ${submittedLocal} ET</li>`
  ].filter(Boolean).join('');

  const html = `
  <div style=\"font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;color:#333;background:#ffffff;\">
    <div style=\"margin:0 0 32px 0;text-align:left;\">
      <a href=\"${siteUrl}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"display:inline-block;\">
        <img src=\"cid:tt-logo\" alt=\"TigerType\" height=\"56\" style=\"display:block;border:none;\"/>
      </a>
    </div>
    <h2 style=\"margin:0 0 16px 0;color:#F58025;font-weight:800;font-size:28px;line-height:1.2;\">Thanks for your feedback!</h2>
    <p style=\"margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#555;\">We really appreciate you taking the time to help improve <strong style=\"color:#F58025;\">TigerType</strong>. Here's a quick summary:</p>
    <ul style=\"margin:0 0 24px 0;padding:0 0 0 20px;font-size:15px;line-height:1.8;color:#555;\">${summaryRows}</ul>
    ${safeMessage ? `<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;margin:0 0 24px 0;border-collapse:separate;border-spacing:0;\">
      <tr>
        <td style=\"background:#f8f8f8;border-left:4px solid #F58025;border-radius:6px;padding:16px 20px;\">
          <div style=\"font-weight:700;margin:0 0 10px 0;font-size:15px;color:#333;\">Your message</div>
          <div style=\"white-space:pre-wrap;line-height:1.6;color:#555;font-size:15px;\">${escapeHtml(safeMessage)}</div>
        </td>
      </tr>
    </table>
    <p style=\"margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#555;\">We'll take a look and follow up if we need any more details.</p>` : ''}
    <p style=\"margin:${safeMessage ? '24px' : '0'} 0 0 0;font-size:15px;color:#888;font-style:italic;\">— TigerType Team</p>
    <hr style=\"border:none;border-top:1px solid #e0e0e0;margin:32px 0 16px 0;\"/>
    <p style=\"margin:0;font-size:13px;color:#999;text-align:center;\">Reply to this email to continue the conversation with the TigerType team.</p>
  </div>`;

  const text = [
    'Thanks for your feedback!',
    '',
    `We received your ${category || 'feedback'} and will look into it shortly.`,
    '',
    'Summary:',
    pagePath ? `• Page: ${pagePath}` : null,
    contactInfo ? `• Contact: ${contactInfo}` : null,
    `• Submitted: ${submittedLocal} ET`,
    '',
    safeMessage ? 'Your message:' : null,
    safeMessage || null,
    '',
    '— TigerType Team'
  ].filter(Boolean).join('\n');

  // Set Reply-To to team addresses (configurable)
  const replyTo = process.env.FEEDBACK_REPLY_TO || process.env.FEEDBACK_EMAIL_TO_TEAM;

  await sendMailGeneric({ from, to, subject, text, html, replyTo });
};

const sendFeedbackEmails = async ({
  category,
  message,
  contactInfo,
  netid,
  userAgent,
  pagePath,
  createdAt,
  ackTo // optional: explicit recipient for acknowledgement (null/undefined to suppress)
}) => {
  const from = process.env.FEEDBACK_EMAIL_FROM;
  const teamList = (process.env.FEEDBACK_EMAIL_TO_TEAM || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // acknowledgement recipient policy: only send when explicitly provided (e.g., authenticated user's email)
  const toUser = (typeof ackTo !== 'undefined') ? ackTo : deriveUserEmail(contactInfo, netid);

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

  // send to team recipients; use first as "to" and rest as "cc" so replies-all includes everyone
  if (teamList.length > 0) {
    const [primaryTeamRecipient, ...ccTeamRecipients] = teamList;
    await sendFeedbackNotification({
      category,
      message,
      contactInfo,
      netid,
      userAgent,
      pagePath,
      createdAt,
      to: primaryTeamRecipient,
      from,
      cc: ccTeamRecipients.length > 0 ? ccTeamRecipients.join(', ') : undefined
    });
  }
};

module.exports = {
  sendFeedbackNotification,
  sendFeedbackEmails
};

// utils for HTML escaping
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/\n/g, ' ');
}

function getLogoAttachment() {
  try {
    const logoPath = path.join(__dirname, '../../client/src/assets/logos/navbar-logo.png');
    if (fs.existsSync(logoPath)) {
      return [{ filename: 'navbar-logo.png', path: logoPath, cid: 'tt-logo' }];
    }
  } catch (_) {}
  return undefined;
}
