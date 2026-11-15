const WebSocket = require('ws');
const WebSocketServer = WebSocket.WebSocketServer || WebSocket.Server;
const config = require('./config');
const db = require('./db');
const { verifyToken, ACCESS_TYPE } = require('./middleware/auth');

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

async function notifyOrder(orderId, type, data = {}) {
  const row = await db.one(
    `SELECT o.customer_id, o.rider_id, r.partner_id
       FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
      WHERE o.id = ?`,
    [orderId]
  );
  if (!row) return;

  const payload = { orderId: String(orderId), ...data };
  send(row.customer_id, type, payload);
  send(row.partner_id, type, payload);
  if (row.rider_id) send(row.rider_id, type, payload);
}

function attachRealtime(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/v1/realtime') {
      socket.destroy();
      return;
    }

    try {
      const token = url.searchParams.get('token');
      const payload = verifyToken(token, config.jwt.accessSecret);
      if (payload.type !== ACCESS_TYPE) throw new Error('Invalid token');

      wss.handleUpgrade(req, socket, head, ws => {
        ws.userId = Number(payload.sub);
        addClient(ws.userId, ws);
        ws.send(JSON.stringify({ type: 'connected', data: { userId: String(ws.userId) } }));
      });
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  return wss;
}

module.exports = { attachRealtime, notifyOrder, send };
