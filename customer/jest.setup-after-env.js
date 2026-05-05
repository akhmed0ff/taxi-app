process.env.EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:9';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
