import { randomUUID } from 'crypto';
import { MSG, encode, decode } from './protocol.js';
import * as GameState from './game-state.js';
import { cullStateForPlayer } from './viewport.js';
import { getTopScores } from './database.js';

export function createConnectionManager(wss, gameEngine, gameState) {
  const connections = new Map(); // playerId -> ws
  const playerData = new Map(); // playerId -> { lastPong, directionTimes: [] }

  const HEARTBEAT_INTERVAL = 5000;
  const HEARTBEAT_TIMEOUT = 3000;
  const MAX_CONNECTIONS = 100;
  const MAX_DIRECTION_RATE = 20; // per second

  wss.on('connection', (ws) => {
    // Check max connections limit
    if (connections.size >= MAX_CONNECTIONS) {
      ws.send(encode(MSG.ERROR, { message: 'Server full' }));
      ws.close();
      return;
    }

    let playerId = null;
    let joined = false;

    ws.on('message', (rawMessage) => {
      try {
        const message = decode(rawMessage.toString());
        if (!message) {
          ws.send(encode(MSG.ERROR, { message: 'Invalid message format' }));
          return;
        }

        // Handle join message
        if (message.type === MSG.JOIN && !joined) {
          const name = message.payload?.name?.trim();

          if (!name || name.length < 1 || name.length > 20) {
            ws.send(encode(MSG.ERROR, { message: 'Name must be 1-20 characters' }));
            return;
          }

          playerId = randomUUID();
          GameState.addSnake(gameState, playerId, name);
          connections.set(playerId, ws);
          playerData.set(playerId, { lastPong: Date.now(), directionTimes: [] });
          joined = true;

          ws.send(encode(MSG.JOIN_ACK, {
            id: playerId,
            arenaWidth: gameState.arenaWidth,
            arenaHeight: gameState.arenaHeight,
            tickRate: 100,
            highScores: getTopScores(10),
          }));

          broadcastPlayerCount();

          return;
        }

        // Handle direction message with rate limiting
        if (message.type === MSG.DIRECTION && joined) {
          const data = playerData.get(playerId);
          if (data) {
            const now = Date.now();
            // Remove timestamps older than 1 second
            data.directionTimes = data.directionTimes.filter(t => now - t < 1000);
            if (data.directionTimes.length >= MAX_DIRECTION_RATE) {
              return; // Rate limited, ignore
            }
            data.directionTimes.push(now);
          }

          const direction = message.payload?.direction;
          if (['up', 'down', 'left', 'right'].includes(direction)) {
            gameEngine.queueDirection(playerId, direction);
          }
          return;
        }

        // Handle pong message
        if (message.type === MSG.PONG && joined) {
          const data = playerData.get(playerId);
          if (data) data.lastPong = Date.now();
          return;
        }
      } catch (err) {
        console.error('Error handling message:', err);
      }
    });

    ws.on('close', () => {
      if (playerId) {
        GameState.removeSnake(gameState, playerId);
        connections.delete(playerId);
        playerData.delete(playerId);
        broadcastPlayerCount();
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });

  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    for (const [playerId, ws] of connections.entries()) {
      const data = playerData.get(playerId);
      if (data && Date.now() - data.lastPong > HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT) {
        // Timed out
        ws.terminate();
        continue;
      }
      if (ws.readyState === 1) {
        ws.send(encode(MSG.PING, { time: Date.now() }));
      }
    }
  }, HEARTBEAT_INTERVAL);

  function broadcast(state) {
    for (const [playerId, ws] of connections.entries()) {
      if (ws.readyState === 1) {
        const culledState = cullStateForPlayer(state, playerId);
        ws.send(encode(MSG.STATE, culledState));
      }
    }
  }

  function broadcastPlayerCount() {
    const message = encode(MSG.PLAYER_COUNT, { count: connections.size });
    for (const ws of connections.values()) {
      if (ws.readyState === 1) { // OPEN
        ws.send(message);
      }
    }
  }

  function sendToPlayer(playerId, type, payload) {
    const ws = connections.get(playerId);
    if (ws && ws.readyState === 1) {
      ws.send(encode(type, payload));
    }
  }

  return {
    broadcast,
    sendToPlayer,
    connections,
    cleanup() {
      clearInterval(heartbeatInterval);
    },
  };
}
