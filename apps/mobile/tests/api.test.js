import { ApiError, api, apiRequest, clearApiSession, setApiSession } from '../src/services/api';

const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

beforeEach(() => {
  clearApiSession();
  global.fetch = jest.fn();
});

test('login posts credentials without an authorization header', async () => {
  global.fetch.mockResolvedValueOnce(reply(200, { accessToken: 'a1', refreshToken: 'r1', user: { email: 'demo@food.com' } }));

  await expect(api.auth.login({ email: 'demo@food.com', password: '123456' })).resolves.toMatchObject({ accessToken: 'a1' });
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toContain('/api/v1/auth/login');
  expect(options.headers.Authorization).toBeUndefined();
  expect(JSON.parse(options.body)).toEqual({ email: 'demo@food.com', password: '123456' });
});

test('an expired access token is refreshed and the request is retried once', async () => {
  const listener = jest.fn();
  setApiSession({ accessToken: 'old', refreshToken: 'refresh' }, listener);
  global.fetch
    .mockResolvedValueOnce(reply(401, { error: 'expired' }))
    .mockResolvedValueOnce(reply(200, { accessToken: 'new', refreshToken: 'next', user: {} }))
    .mockResolvedValueOnce(reply(200, { orders: [] }));

  await expect(api.orders.list()).resolves.toEqual({ orders: [] });
  expect(global.fetch.mock.calls[1][0]).toContain('/api/v1/auth/refresh');
  expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer new');
  expect(listener).toHaveBeenCalledWith({ accessToken: 'new', refreshToken: 'next' });
});

test('a network failure has status 0 so callers can fall back to local data', async () => {
  global.fetch.mockRejectedValueOnce(new Error('offline'));
  const error = await apiRequest('/orders').catch(value => value);
  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(0);
});
