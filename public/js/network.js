export function createNetwork() {
  let ws = null;
  let messageHandler = null;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let intentionalClose = false;
  let onStatusChange = null;

  const BACKOFF_BASE = 1000;
  const BACKOFF_MAX = 15000;
  const JITTER_MAX = 500;

  function connect() {
    intentionalClose = false;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
      console.log('Connected to server');
      reconnectAttempts = 0;
      if (onStatusChange) onStatusChange('connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ping') {
          send('pong', { time: msg.payload?.time });
          return;
        }
        if (messageHandler) messageHandler(msg);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected');
      if (onStatusChange) onStatusChange('disconnected');
      if (!intentionalClose) {
        scheduleReconnect();
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
    };
  }

  function scheduleReconnect() {
    const delay = Math.min(BACKOFF_BASE * Math.pow(2, reconnectAttempts), BACKOFF_MAX);
    const jitter = Math.random() * JITTER_MAX;
    reconnectAttempts++;

    console.log(`Reconnecting in ${Math.round(delay + jitter)}ms...`);
    if (onStatusChange) onStatusChange('reconnecting');

    reconnectTimer = setTimeout(() => {
      connect();
    }, delay + jitter);
  }

  function send(type, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  function onMessage(handler) { messageHandler = handler; }

  function onStatus(handler) { onStatusChange = handler; }

  function disconnect() {
    intentionalClose = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) ws.close();
  }

  return { connect, send, onMessage, onStatus, disconnect };
}
