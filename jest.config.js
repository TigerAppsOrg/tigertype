module.exports = {
  testEnvironment: 'node',
  verbose: true,
  forceExit: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['./server/tests/setup.js'],
  globalTeardown: './server/tests/teardown.js'
}; 