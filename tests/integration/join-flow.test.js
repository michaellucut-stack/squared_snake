import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createGameState } from '../../server/game-state.js';
import { createGameEngine } from '../../server/game-engine.js';
import { createConnectionManager } from '../../server/connection-manager.js';

// Helper to create a test server
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

function connectClient(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on('open', () => resolve(ws));
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

describe('join flow', () => {
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

  it('player can join and receive join_ack', async () => {
    const ws = await connectClient(ctx.port);

    ws.send(JSON.stringify({ type: 'join', payload: { name: 'TestPlayer' } }));
    const msg = await waitForMessage(ws, 'join_ack');

    expect(msg.payload.id).toBeDefined();
    expect(msg.payload.arenaWidth).toBe(200);
    expect(msg.payload.arenaHeight).toBe(200);
    expect(msg.payload.tickRate).toBe(100);

    ws.close();
  });

  it('player receives state updates after joining', async () => {
    const ws = await connectClient(ctx.port);

    ws.send(JSON.stringify({ type: 'join', payload: { name: 'StateTest' } }));
    await waitForMessage(ws, 'join_ack');

    const stateMsg = await waitForMessage(ws, 'state');
    expect(stateMsg.payload.tick).toBeDefined();
    expect(stateMsg.payload.snakes).toBeDefined();

    ws.close();
  });

  it('rejects empty name', async () => {
    const ws = await connectClient(ctx.port);

    ws.send(JSON.stringify({ type: 'join', payload: { name: '' } }));
    const msg = await waitForMessage(ws, 'error');

    expect(msg.payload.message).toContain('Name');

    ws.close();
  });

  it('rejects name over 20 characters', async () => {
    const ws = await connectClient(ctx.port);

    ws.send(JSON.stringify({ type: 'join', payload: { name: 'A'.repeat(21) } }));
    const msg = await waitForMessage(ws, 'error');

    expect(msg.payload.message).toContain('Name');

    ws.close();
  });
});
