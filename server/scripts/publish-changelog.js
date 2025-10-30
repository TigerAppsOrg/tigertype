const axios = require('axios');

const REQUIRED_ENVS = [
  'CHANGELOG_API_BASE',
  'CHANGELOG_API_TOKEN',
  'PR_NUMBER',
  'PR_TITLE',
  'PR_URL'
];

const ensureRequired = () => {
  const missing = REQUIRED_ENVS.filter((key) => !process.env[key] || process.env[key].trim() === '');
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

const parseLabels = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item.name === 'string') return item.name;
        return null;
      })
      .filter(Boolean);
  } catch (err) {
    console.warn('Unable to parse PR_LABELS, defaulting to empty array');
    return [];
  }
};

const buildPayload = () => {
  const prNumber = Number.parseInt(process.env.PR_NUMBER, 10);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error(`Invalid PR number: ${process.env.PR_NUMBER}`);
  }

  return {
    pr_number: prNumber,
    title: process.env.PR_TITLE,
    body: process.env.PR_BODY || '',
    url: process.env.PR_URL,
    merged_at: process.env.PR_MERGED_AT || null,
    merged_by: process.env.PR_MERGED_BY || null,
    labels: parseLabels(process.env.PR_LABELS)
  };
};

const postChangelog = async (payload) => {
  const base = process.env.CHANGELOG_API_BASE.replace(/\/$/, '');
  const token = process.env.CHANGELOG_API_TOKEN;
  const target = `${base}/api/changelog/publish`;

  const { data } = await axios.post(target, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });

  return data;
};

const main = async () => {
  ensureRequired();
  const payload = buildPayload();
  const response = await postChangelog(payload);
  const entry = response.entry || {};
  console.log(`Published changelog entry for PR #${payload.pr_number} (id=${entry.id ?? 'unknown'})`);
};

main().catch((err) => {
  const details = err.response?.data || err.message || err;
  console.error('Failed to publish changelog entry:', details);
  process.exitCode = 1;
});
