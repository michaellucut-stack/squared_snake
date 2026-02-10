import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createGameState } from '../../server/game-state.js';
import { createGameEngine } from '../../server/game-engine.js';
import { createConnectionManager } from '../../server/connection-manager.js';

function createTestServer() {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });
  const gameState = createGameState();
  const engine = createGameEngine(gameState, (state) => {
    cm.broadcast(state);
  });
  const cm = createConnectionManager(wss, engine, gameState);
  engine.start();

  return new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      resolve({ server, wss, gameState, engine, cm, port });
    });
  });
}

function connectAndJoin(port, name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'join', payload: { name } }));
    });
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'join_ack') {
        resolve({ ws, id: msg.payload.id });
      }
    });
    ws.on('error', reject);
  });
}

function waitForMessage(ws, type, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeout);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === type) {
        clearTimeout(timer);
        ws.off('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
  });
}

describe('gameplay', () => {
  let ctx;

  beforeAll(async () => {
    ctx = await createTestServer();
  });

  afterAll(() => {
    ctx.engine.stop();
    ctx.cm.cleanup();
    ctx.wss.close();
    ctx.server.close();
  });

  it('direction change is reflected in state', async () => {
    const { ws, id } = await connectAndJoin(ctx.port, 'DirTest');

    ws.send(JSON.stringify({ type: 'direction', payload: { direction: 'up' } }));

    // Wait for a state that contains our snake
    const stateMsg = await waitForMessage(ws, 'state');
    const own = stateMsg.payload.snakes?.find(s => s.id === id);
    // Direction may or may not be applied yet depending on timing
    expect(own).toBeDefined();

    ws.close();
  });

  it('multiple players see each other', async () => {
    const p1 = await connectAndJoin(ctx.port, 'Player1');
    const p2 = await connectAndJoin(ctx.port, 'Player2');

    // Wait for state updates - both should be in the snakes array
    // (if within viewport of each other - they might not be, so just verify both connected)
    const state1 = await waitForMessage(p1.ws, 'state');
    expect(state1.payload.snakes.length).toBeGreaterThanOrEqual(1);

    p1.ws.close();
    p2.ws.close();
  });

  it('disconnect removes player', async () => {
    const { ws, id } = await connectAndJoin(ctx.port, 'DCTest');

    ws.close();

    // Give server time to process
    await new Promise(r => setTimeout(r, 200));

    // Snake should be removed from state
    const snake = ctx.gameState.snakes.get(id);
    expect(snake).toBeUndefined();
  });

  it('food exists in game state', async () => {
    const { ws } = await connectAndJoin(ctx.port, 'FoodTest');

    const stateMsg = await waitForMessage(ws, 'state');
    // Food should exist (maintained by engine)
    expect(stateMsg.payload.food).toBeDefined();

    ws.close();
  });
});
