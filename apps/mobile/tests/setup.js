// Screen tests exercise UI and navigation; animations run only in the native app.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  FadeIn: { duration: () => undefined },
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
global.IS_REACT_ACT_ENVIRONMENT = true;
// No test reaches the network: the AI chat falls back to local matching unless a test supplies a reply.
beforeEach(() => { global.fetch = jest.fn(() => Promise.reject(new Error('Network is disabled in tests'))); });
