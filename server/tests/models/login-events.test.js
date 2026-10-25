const { newDb } = require('pg-mem');

jest.mock('../../config/database', () => ({ query: jest.fn(), pool: {} }));
jest.mock('../../db', () => ({ getTimedLeaderboard: jest.fn() }));

const database = require('../../config/database');
const User = require('../../models/user');

let pool;
beforeEach(async () => {
  const db = newDb();
  const adapter = db.adapters.createPg();
  pool = new adapter.Pool();
  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY, netid TEXT UNIQUE NOT NULL,
      last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      bio TEXT, avatar_url TEXT, races_completed INTEGER DEFAULT 0,
      avg_wpm FLOAT DEFAULT 0, avg_accuracy FLOAT DEFAULT 0,
      fastest_wpm FLOAT DEFAULT 0, has_completed_tutorial BOOLEAN DEFAULT false,
      selected_title_id INTEGER, last_seen_changelog_id INTEGER,
      last_seen_changelog_at TIMESTAMPTZ
    );
    CREATE TABLE login_events (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      logged_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  database.query.mockReset();
  database.query.mockImplementation((...args) => pool.query(...args));
});

afterEach(async () => pool.end());

test('first login creates an account and records its event', async () => {
  const user = await User.findOrCreate('first_login');
  expect(user.netid).toBe('first_login');
  const { rows } = await pool.query('SELECT user_id FROM login_events');
  expect(rows).toEqual([{ user_id: user.id }]);
});

test('a new login preserves the previous day and repeated logins count once per day', async () => {
  const user = await User.findOrCreate('returning_user');
  // Fixture: a login at 23:59 Eastern, followed by another after midnight.
  await pool.query("UPDATE login_events SET logged_in_at = '2026-10-23T03:59:00Z'");
  await pool.query("UPDATE users SET last_login = '2026-10-22 23:59:00'");
  await User.findOrCreate('returning_user');
  await User.findOrCreate('returning_user');
  await pool.query("UPDATE login_events SET logged_in_at = '2026-10-23T04:05:00Z' WHERE id > 1");
  expect((await pool.query('SELECT * FROM login_events')).rows).toHaveLength(3);
  const { rows } = await pool.query(`
    SELECT COUNT(DISTINCT user_id) AS dau FROM login_events
    WHERE logged_in_at >= '2026-10-22T04:00:00Z'
      AND logged_in_at < '2026-10-23T04:00:00Z'
  `);
  expect(rows[0].dau).toBe(1);
  const allUsers = await pool.query('SELECT COUNT(DISTINCT user_id) AS dau FROM login_events');
  expect(allUsers.rows[0].dau).toBe(1);
  expect((await pool.query('SELECT user_id FROM login_events')).rows.every(row => row.user_id === user.id)).toBe(true);
});

test('updating a missing account does not create an orphan event', async () => {
  expect(await User.updateLastLogin(999)).toBeUndefined();
  expect((await pool.query('SELECT * FROM login_events')).rows).toEqual([]);
});

test('login write failures propagate instead of reporting a successful account update', async () => {
  const failure = new Error('database unavailable');
  database.query.mockRejectedValueOnce(failure);
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await expect(User.updateLastLogin(1)).rejects.toThrow(failure);
  } finally {
    log.mockRestore();
  }
});
