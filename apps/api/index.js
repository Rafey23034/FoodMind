const http = require('http');
const app = require('./src/app');
const config = require('./src/config');
const db = require('./src/db');
const { attachRealtime } = require('./src/realtime');
const { startOfferWorker, stopOfferWorker } = require('./src/services/dispatch');

const server = http.createServer(app);
attachRealtime(server);
startOfferWorker();

server.listen(config.port, () => {
  console.log(`FoodMind API listening on http://localhost:${config.port}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down.`);
  stopOfferWorker();
  server.close(async () => {
    await db.pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
