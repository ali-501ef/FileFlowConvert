// Jest configuration for FileFlow upload integration tests
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
  testMatch: ['<rootDir>/**/*.test.js'],
  collectCoverageFrom: [
    '../js/uploader.js',
    '../js/upload-dispatch.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};