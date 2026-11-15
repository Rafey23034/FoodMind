const WebSocket = require('ws');
const config = require('./config');
const db = require('./db');
const { verifyToken, ACCESS_TYPE } = require('./middleware/auth');

// Live updates over one WebSocket per signed-in phone: ws://<api>/api/v1/realtime?token=<access token>
//
// Server -> app, always { type, data }:
//   delivery.offer      a rider was offered an order (sent to that rider)
//   offer.expired       the rider did not answer in time (sent to that rider)
//   order.*             an order changed: created, status_changed, rider_assigned, ... (sent to everyone on it)
// App -> server:
//   rider.location      { lat, lng, accuracyM } from a rider, every minute while online
//
// Messages only say *that* something changed; the app then reloads the details with the normal REST calls.

const PATH = '/api/v1/realtime';
const HEARTBEAT_MS = 30000;
const clients = new Map();

function addClient(userId, socket) {
  const key = String(userId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(socket);
  socket.on('close', () => {
    const set = clients.get(key);
    if (!set) return;
    set.delete(socket);
    if (!set.size) clients.delete(key);
  });
}

function send(userId, type, data) {
  const set = clients.get(String(userId));
  if (!set) return;
  const message = JSON.stringify({ type, data });
  for (const socket of set) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
}

// Tells the customer, the restaurant and the rider of an order. "except" skips the user who caused it.
async function notifyOrder(orderId, type, data = {}, { except } = {}) {
  const row = await db.one(
    `SELECT o.customer_id, o.rider_id, r.partner_id
       FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
      WHERE o.id = ?`,
    [orderId]
  );
  if (!row) return;

  const payload = { orderId: String(orderId), ...data };
  for (const userId of [row.customer_id, row.partner_id, row.rider_id]) {
    if (userId && String(userId) !== String(except)) send(userId, type, payload);
  }
}

async function handleMessage(socket, raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    return;
  }
  if (message?.type !== 'rider.location' || socket.user.role !== 'rider') return;

  const lat = Number(message.data?.lat);
  const lng = Number(message.data?.lng);
  const accuracyM = message.data?.accuracyM == null ? undefined : Number(message.data.accuracyM);
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180) || (accuracyM !== undefined && !(accuracyM >= 0))) {
    socket.send(JSON.stringify({ type: 'error', data: { message: 'Invalid location.' } }));
    return;
  }
  try {
    // Required here rather than at the top: riders.js also requires this file.
    await require('./services/riders').ping(socket.user.id, { lat, lng, accuracyM });
  } catch (error) {
    socket.send(JSON.stringify({ type: 'error', data: { message: error.message } }));
  }
}

function attachRealtime(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== PATH) {
      socket.destroy();
      return;
    }

    let user;
    try {
      const payload = verifyToken(url.searchParams.get('token'), config.jwt.accessSecret);
      if (payload.type !== ACCESS_TYPE) throw new Error('Invalid token');
      user = { id: Number(payload.sub), role: payload.role };
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, ws => {
      ws.user = user;
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      ws.on('message', raw => handleMessage(ws, raw.toString()));
      addClient(user.id, ws);
      ws.send(JSON.stringify({ type: 'connected', data: { userId: String(user.id) } }));
    });
  });

  // Phones that lose signal often never close the socket; drop the ones that stop answering pings.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();
  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

module.exports = { attachRealtime, notifyOrder, send, PATH };
