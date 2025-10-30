const { query } = require('../config/database');

const coerceLabels = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item.name === 'string') return item.name;
        return null;
      })
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return coerceLabels(parsed);
    } catch (err) {
      return [];
    }
  }
  return [];
};

const Changelog = {
  async create(entry) {
    const labels = coerceLabels(entry.labels);
    const mergedAt = entry.merged_at ? new Date(entry.merged_at) : null;
    const publishedAt = entry.published_at ? new Date(entry.published_at) : null;

    const result = await query(
      `INSERT INTO changelogs (pr_number, title, body, url, merged_at, merged_by, labels, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, COALESCE($8, CURRENT_TIMESTAMP))
       ON CONFLICT (pr_number) DO UPDATE SET
         title = EXCLUDED.title,
         body = EXCLUDED.body,
         url = EXCLUDED.url,
         merged_at = EXCLUDED.merged_at,
         merged_by = EXCLUDED.merged_by,
         labels = EXCLUDED.labels,
         published_at = COALESCE(EXCLUDED.published_at, changelogs.published_at)
       RETURNING id, pr_number, title, body, url, merged_at, merged_by, labels, published_at;
      `,
      [
        entry.pr_number,
        entry.title,
        entry.body || null,
        entry.url || null,
        mergedAt,
        entry.merged_by || null,
        JSON.stringify(labels),
        publishedAt,
      ]
    );

    return result.rows[0];
  },

  async list(limit = 20, offset = 0) {
    const result = await query(
      `SELECT id, pr_number, title, body, url, merged_at, merged_by, labels, published_at
       FROM changelogs
       ORDER BY COALESCE(published_at, merged_at, NOW()) DESC
       LIMIT $1 OFFSET $2;
      `,
      [limit, offset]
    );
    return result.rows;
  },

  async latest() {
    const result = await query(
      `SELECT id, pr_number, title, body, url, merged_at, merged_by, labels, published_at
       FROM changelogs
       ORDER BY COALESCE(published_at, merged_at, NOW()) DESC
       LIMIT 1;
      `
    );
    return result.rows[0] || null;
  }
};

module.exports = Changelog;
