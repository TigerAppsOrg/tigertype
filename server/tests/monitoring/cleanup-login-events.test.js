const { newDb } = require('pg-mem');
const { cleanupLoginEvents } = require('../../../monitoring/cleanup-login-events');

test('cleanup deletes only events older than 90 days, preserves users, and can run again', async () => {
  const adapter = newDb().adapters.createPg();
  const pool = new adapter.Pool();
  const now = new Date('2026-10-24T12:00:00Z');
  const cutoff = now.getTime() - 90 * 24 * 60 * 60 * 1000;
  try {
    await pool.query(`
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      CREATE TABLE login_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        logged_in_at TIMESTAMPTZ NOT NULL
      );
      INSERT INTO users VALUES (42);
    `);
    for (const timestamp of [cutoff - 1, cutoff, cutoff + 1, now.getTime()]) {
      await pool.query('INSERT INTO login_events (user_id, logged_in_at) VALUES (42, $1)', [new Date(timestamp)]);
    }
    expect(await cleanupLoginEvents(pool, now)).toBe(1);
    const { rows } = await pool.query('SELECT id FROM login_events ORDER BY id');
    expect(rows.map(row => row.id)).toEqual([2, 3, 4]);
    expect((await pool.query('SELECT * FROM users')).rows).toEqual([{ id: 42 }]);
    expect(await cleanupLoginEvents(pool, now)).toBe(0);
  } finally {
    await pool.end();
  }
});

test('cleanup propagates database errors', async () => {
  const pool = { query: jest.fn().mockRejectedValue(new Error('permission denied')) };
  await expect(cleanupLoginEvents(pool)).rejects.toThrow('permission denied');
});
