module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
  moduleNameMapper: { '\\.svg$': '<rootDir>/tests/svgMock.js' },
  // Font Awesome publishes uncompiled ES modules; transform them alongside Expo's allowlist.
  transformIgnorePatterns: require('jest-expo/jest-preset').transformIgnorePatterns.map(pattern =>
    pattern.replace('|standard-navigation)', '|standard-navigation|@fortawesome/react-native-fontawesome)')),
};
