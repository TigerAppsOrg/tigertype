// Seed delegated SMTP OAuth token cache via device code, then persist to file
// Usage: node server/scripts/seed_smtp_oauth_device_login.js

require('dotenv').config();
const { PublicClientApplication } = require('@azure/msal-node');
const fs = require('fs');
const path = require('path');

const tenantId = process.env.AZURE_TENANT_ID || process.env.TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID || process.env.CLIENT_ID;
const CACHE_PATH = process.env.SMTP_OAUTH_CACHE_PATH || path.join(__dirname, '..', '.smtp_oauth_cache.json');

if (!tenantId || !clientId) {
  console.error('Missing AZURE_TENANT_ID or AZURE_CLIENT_ID');
  process.exit(1);
}

const SMTP_SCOPES = ['https://outlook.office365.com/SMTP.Send', 'offline_access', 'openid', 'email'];

const tokenCachePlugin = {
  beforeCacheAccess: async (context) => {
    try {
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
      } catch (e) {
        console.warn('Failed to write cache file', e);
      }
    }
  }
};

const pca = new PublicClientApplication({
  auth: { clientId, authority: `https://login.microsoftonline.com/${tenantId}` },
  cache: { cachePlugin: tokenCachePlugin }
});

(async () => {
  const result = await pca.acquireTokenByDeviceCode({
    scopes: SMTP_SCOPES,
    deviceCodeCallback: (info) => console.log(info.message)
  });
  console.log('Access token acquired. Token cache stored at:', CACHE_PATH);
  // Print cache JSON to stdout for copying into SMTP_OAUTH_CACHE env var (Heroku)
  const cacheJson = await pca.getTokenCache().serialize();
  console.log('--- BEGIN SMTP_OAUTH_CACHE JSON ---');
  console.log(cacheJson);
  console.log('--- END SMTP_OAUTH_CACHE JSON ---');
  console.log('If deploying to Heroku, set config var SMTP_OAUTH_CACHE to the JSON above.');
})();

