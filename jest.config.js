module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: ['server/**/*.js', '!server/index.js', '!server/excelSync.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000
};
