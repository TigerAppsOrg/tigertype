jest.mock('../../config/database', () => ({ pool: { connect: jest.fn() } }));
const { pool } = require('../../config/database');
const { runMigrations } = require('../../db/migrations');

function database({ failBuild = false, failTable = false, failSeed = false, version = 19 } = {}) {
  const indexes = new Map();
  const recorded = [];
  let transaction = false;
  let timeout = '30s';
  const client = {
    release: jest.fn(),
    query: jest.fn(async (sql, params) => {
      if (sql === 'BEGIN') transaction = true;
      if (sql === 'COMMIT' || sql === 'ROLLBACK') transaction = false;
      if (sql.includes('MAX(version)')) return { rows: [{ version }] };
      if (sql === 'SHOW statement_timeout') return { rows: [{ statement_timeout: timeout }] };
      if (sql === 'SET statement_timeout = 0') timeout = '0';
      if (sql.includes("set_config('statement_timeout'")) timeout = params[0];
      if (sql.includes('SELECT indisvalid')) {
        return { rows: indexes.has(params[0]) ? [{ indisvalid: indexes.get(params[0]) }] : [] };
      }
      if (sql.startsWith('DROP INDEX CONCURRENTLY')) indexes.delete(sql.split(' ').at(-1));
      if (sql.startsWith('CREATE INDEX CONCURRENTLY')) {
        expect(transaction).toBe(false);
        expect(timeout).toBe('0');
        const name = sql.split(' ')[6];
        if (failBuild && name === 'idx_partial_sessions_created_at') {
          indexes.set(name, false);
          throw new Error('interrupted index build');
        }
        indexes.set(name, true);
      }
      if (sql.includes('CREATE TABLE login_events')) {
        expect(transaction).toBe(true);
        expect(timeout).toBe('30s');
        if (failTable) throw new Error('table creation failed');
      }
      if (sql.includes('INSERT INTO login_events')) {
        expect(transaction).toBe(true);
        if (failSeed) throw new Error('login seed failed');
      }
      if (sql.startsWith('INSERT INTO migrations')) recorded.push(params[0]);
      return { rows: [] };
    })
  };
  pool.connect.mockResolvedValue(client);
  return { client, recorded, indexes, timeout: () => timeout };
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('builds indexes outside transactions without timeout, then creates login history transactionally', async () => {
  const db = database();
  await runMigrations();
  expect(db.indexes.size).toBe(3);
  expect(db.recorded).toEqual([20, 21]);
  expect(db.timeout()).toBe('30s');
  expect(db.client.query).toHaveBeenCalledWith('SELECT pg_advisory_lock(1953064805, 1)');
  expect(db.client.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1953064805, 1)');
  expect(db.client.release).toHaveBeenCalledWith(undefined);
});

test('failed index build stops before login history, restores timeout and repairs invalid indexes on retry', async () => {
  const db = database({ failBuild: true });
  await expect(runMigrations()).rejects.toThrow('interrupted index build');
  expect(db.recorded).toEqual([]);
  expect(db.timeout()).toBe('30s');
  expect(db.client.release).toHaveBeenCalledWith(expect.any(Error));
  const retry = database();
  retry.indexes.set('idx_race_results_created_at', true);
  retry.indexes.set('idx_partial_sessions_created_at', false);
  await runMigrations();
  expect(retry.client.query).toHaveBeenCalledWith('DROP INDEX CONCURRENTLY IF EXISTS idx_partial_sessions_created_at');
  expect(retry.recorded).toEqual([20, 21]);
});

test('rolls back failed login table creation while retaining the completed concurrent migration', async () => {
  const db = database({ failTable: true });
  await expect(runMigrations()).rejects.toThrow('table creation failed');
  expect(db.recorded).toEqual([20]);
  expect(db.client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(db.client.release).toHaveBeenCalledWith(expect.any(Error));
});

test('an up-to-date database releases the lock without rebuilding anything', async () => {
  const db = database({ version: 21 });
  await runMigrations();
  expect(db.indexes.size).toBe(0);
  expect(db.recorded).toEqual([]);
  expect(db.client.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1953064805, 1)');
});

test('seed failure rolls back login history and leaves migration 21 pending', async () => {
  const db = database({ failSeed: true });
  await expect(runMigrations()).rejects.toThrow('login seed failed');
  expect(db.recorded).toEqual([20]);
  expect(db.client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(db.client.release).toHaveBeenCalledWith(expect.any(Error));
});
