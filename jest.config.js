'use strict'

module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__fixtures__/',
    'src/bin/cli.js'
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  }
}
