module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup-after-env.js',
    '@testing-library/jest-native/extend-expect',
  ],
};
