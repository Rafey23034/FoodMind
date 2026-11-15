import { API_ORIGIN, getApiSession } from './api';

const RETRY_MS = 5000;
const OPEN = 1;

// Opens FoodMind's live-updates WebSocket and keeps it open, reconnecting 5 seconds after any drop.
// onMessage receives { type, data } from the server; onStatus receives true when connected, false when not.
// Returns { send(type, data), close() }.
export function connectRealtime({ onMessage, onStatus } = {}) {
  let socket = null;
  let retry = null;
  let stopped = false;

  function scheduleRetry() {
    if (!stopped) retry = setTimeout(open, RETRY_MS);
  }

  function open() {
    const { accessToken } = getApiSession();
    if (stopped) return;
    if (!accessToken || typeof WebSocket !== 'function') { scheduleRetry(); return; }

    socket = new WebSocket(`${API_ORIGIN.replace(/^http/, 'ws')}/api/v1/realtime?token=${encodeURIComponent(accessToken)}`);
    socket.onopen = () => onStatus?.(true);
    socket.onmessage = event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      onMessage?.(message);
    };
    socket.onerror = () => {}; // "onclose" always follows and schedules the retry
    socket.onclose = () => {
      socket = null;
      onStatus?.(false);
      scheduleRetry();
    };
  }

  open();
  return {
    send(type, data) {
      if (socket?.readyState !== OPEN) return false;
      socket.send(JSON.stringify({ type, data }));
      return true;
    },
    close() {
      stopped = true;
      clearTimeout(retry);
      socket?.close();
    },
  };
}
