import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createGameState } from './game-state.js';
import { createGameEngine } from './game-engine.js';
import { createConnectionManager } from './connection-manager.js';
import { initDatabase, closeDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Create HTTP server
const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(PUBLIC_DIR, filePath);

  const extname = path.extname(filePath);
  const contentType = CONTENT_TYPES[extname] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Initialize database
initDatabase();

// Initialize game
const gameState = createGameState();
const gameEngine = createGameEngine(gameState, (state) => {
  connectionManager.broadcast(state);
});
const connectionManager = createConnectionManager(wss, gameEngine, gameState);

// Start game engine
gameEngine.start();

// Start server
server.listen(PORT, () => {
  console.log(`Snake game server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  gameEngine.stop();
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  gameEngine.stop();
  closeDatabase();
  process.exit(0);
});
