/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../src/App';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

test('renders correctly', async () => {
  let app;
  await ReactTestRenderer.act(() => {
    app = ReactTestRenderer.create(<App />);
  });

  expect(app.root.findAllByProps({ testID: 'get-started-button' }).length).toBeGreaterThan(0);

  await ReactTestRenderer.act(() => {
    app.unmount();
  });
}, 30000);
