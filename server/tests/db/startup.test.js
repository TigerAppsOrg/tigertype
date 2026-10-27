const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the actual startup function without loading HTTP routes or external services.
const source = fs.readFileSync(path.join(__dirname, '../../../server.js'), 'utf8');
const startup = source.slice(source.indexOf('// --- Server Start ---'));

async function start({ initError, migrationError } = {}) {
  const server = { listen: jest.fn() };
  const process = { env: { NODE_ENV: 'test' }, exit: jest.fn() };
  const initDB = initError ? jest.fn().mockRejectedValue(initError) : jest.fn().mockResolvedValue(true);
  const runMigrations = migrationError ? jest.fn().mockRejectedValue(migrationError) : jest.fn().mockResolvedValue();
  const client = { query: jest.fn().mockResolvedValue({ rows: [{ count: '0' }] }), release: jest.fn() };
  await vm.runInNewContext(startup, {
    require: name => {
      if (name === './server/db') return { initDB };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    console: { log() {}, error() {} },
    server, process, runMigrations,
    pool: { connect: async () => client }
  });
  return { server, process };
}

test('does not listen when database initialization fails', async () => {
  const result = await start({ initError: new Error('index build failed') });
  expect(result.server.listen).not.toHaveBeenCalled();
  expect(result.process.exit).toHaveBeenCalledWith(1);
});

test('does not listen when migration verification fails', async () => {
  const result = await start({ migrationError: new Error('login_events missing') });
  expect(result.server.listen).not.toHaveBeenCalled();
  expect(result.process.exit).toHaveBeenCalledWith(1);
});

test('listens after successful initialization and migrations', async () => {
  const result = await start();
  expect(result.server.listen).toHaveBeenCalledWith(3000, expect.any(Function));
  expect(result.process.exit).not.toHaveBeenCalled();
});
