import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import auth, { login } from '../src/redux/authSlice';
import rider, { setRiderOnline } from '../src/redux/riderSlice';
import { clearApiSession, setApiSession } from '../src/services/api';
import { connectRealtime } from '../src/services/realtime';
import useRiderRealtime from '../src/components/rider/useRiderRealtime';
import { RIDER_DEMO_LOCATION } from '../src/redux/apiThunks';

// A stand-in for the phone's WebSocket that the test can open, message and close.
class FakeSocket {
  static all = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeSocket.all.push(this); }
  send(text) { this.sent.push(JSON.parse(text)); }
  close() { this.readyState = 3; this.onclose?.(); }
  serverOpens() { this.readyState = 1; this.onopen?.(); }
  serverSends(message) { this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) }); }
  serverDrops() { this.readyState = 3; this.onclose?.(); }
}
const latest = () => FakeSocket.all.at(-1);

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.all = [];
  global.WebSocket = FakeSocket;
  setApiSession({ accessToken: 'token 1', refreshToken: 'r1' });
});
afterEach(() => {
  clearApiSession();
  delete global.WebSocket;
  jest.useRealTimers();
});

test('the client connects with the access token, passes messages on and reconnects after a drop', () => {
  const onMessage = jest.fn();
  const onStatus = jest.fn();
  const connection = connectRealtime({ onMessage, onStatus });
  expect(latest().url).toMatch(/^ws:\/\/.+\/api\/v1\/realtime\?token=token%201$/);
  expect(connection.send('rider.location', {})).toBe(false); // not open yet

  latest().serverOpens();
  expect(onStatus).toHaveBeenLastCalledWith(true);
  latest().serverSends({ type: 'delivery.offer', data: { offerId: '4' } });
  latest().serverSends('not json');
  expect(onMessage).toHaveBeenCalledTimes(1);
  expect(onMessage).toHaveBeenCalledWith({ type: 'delivery.offer', data: { offerId: '4' } });
  expect(connection.send('rider.location', { lat: 1, lng: 2 })).toBe(true);
  expect(latest().sent).toEqual([{ type: 'rider.location', data: { lat: 1, lng: 2 } }]);

  latest().serverDrops();
  expect(onStatus).toHaveBeenLastCalledWith(false);
  setApiSession({ accessToken: 'token 2', refreshToken: 'r2' });
  jest.advanceTimersByTime(5000);
  expect(FakeSocket.all).toHaveLength(2);
  expect(latest().url).toMatch(/token=token%202$/); // a refreshed token is used on reconnect

  connection.close();
  jest.advanceTimersByTime(20000);
  expect(FakeSocket.all).toHaveLength(2); // closing for good stops reconnecting
});

function Probe({ enabled, onLive }) {
  onLive(useRiderRealtime(enabled));
  return null;
}

test('rider events reload data, location goes over the socket, and polling only runs while disconnected', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
  const store = configureStore({ reducer: { auth, rider } });
  store.dispatch(login({ name: 'Rider', email: 'r@food.com', role: 'rider', accessToken: 'token 1', refreshToken: 'r1' }));
  store.dispatch(setRiderOnline({ userKey: 'r@food.com', online: true }));
  const live = [];
  let tree;
  await act(async () => { tree = renderer.create(<Provider store={store}><Probe enabled onLive={value => live.push(value)} /></Provider>); });
  const loads = () => global.fetch.mock.calls.filter(([url]) => url.endsWith('/rider/status')).length;
  expect(loads()).toBe(1); // first load on mount

  // Disconnected: the 10-second backup refresh runs.
  await act(async () => { jest.advanceTimersByTime(10000); });
  expect(loads()).toBe(2);

  // Connected: a catch-up load, the location is sent, and no more polling.
  await act(async () => latest().serverOpens());
  expect(live.at(-1)).toBe(true);
  expect(loads()).toBe(3);
  expect(latest().sent).toEqual([{ type: 'rider.location', data: RIDER_DEMO_LOCATION }]);
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(loads()).toBe(3);

  // Events reload; unrelated messages do not.
  await act(async () => latest().serverSends({ type: 'delivery.offer', data: {} }));
  await act(async () => latest().serverSends({ type: 'order.status_changed', data: {} }));
  await act(async () => latest().serverSends({ type: 'connected', data: {} }));
  expect(loads()).toBe(5);
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(latest().sent).toHaveLength(2); // location again after a minute

  await act(async () => tree.unmount());
  expect(latest().readyState).toBe(3);
});

test('without an API session the hook opens no socket', async () => {
  const store = configureStore({ reducer: { auth, rider } });
  let tree;
  await act(async () => { tree = renderer.create(<Provider store={store}><Probe enabled={false} onLive={() => {}} /></Provider>); });
  expect(FakeSocket.all).toHaveLength(0);
  await act(async () => tree.unmount());
});
