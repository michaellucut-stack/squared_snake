import { createNetwork } from './network.js';
import { createInput } from './input.js';
import { createRenderer } from './renderer.js';
import { createUI } from './ui.js';

const network = createNetwork();
const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);
const ui = createUI();

let playerId = null;
let gameState = { snakes: [], food: [], tick: 0 };
let joined = false;
let playerName = '';

const joinScreen = document.getElementById('join-screen');
const nameInput = document.getElementById('name-input');
const playBtn = document.getElementById('play-btn');
const controlPicker = document.getElementById('control-picker');

// Show control picker on touch devices
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  controlPicker.style.display = '';
}

// Connection status overlay
const reconnectOverlay = document.createElement('div');
reconnectOverlay.id = 'reconnect-overlay';
reconnectOverlay.innerHTML = '<p>Reconnecting...</p>';
reconnectOverlay.style.display = 'none';
document.body.appendChild(reconnectOverlay);

network.onStatus((status) => {
  if (status === 'reconnecting') {
    reconnectOverlay.style.display = 'flex';
  } else if (status === 'connected') {
    reconnectOverlay.style.display = 'none';
    // Re-join if we were previously joined
    if (joined && playerName) {
      setTimeout(() => {
        network.send('join', { name: playerName });
      }, 200);
    }
  }
});

function join() {
  const name = nameInput.value.trim();
  if (!name || name.length < 1) return;
  playerName = name;

  // Read control scheme before connecting
  const controlChoice = document.querySelector('input[name="controls"]:checked');
  if (controlChoice) {
    input.setTouchMode(controlChoice.value);
  }

  network.connect();
  network.onMessage(handleMessage);

  setTimeout(() => {
    network.send('join', { name });
  }, 500);
}

playBtn.addEventListener('click', join);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') join();
});

const input = createInput((dir) => {
  network.send('direction', { direction: dir });
});

function handleMessage(msg) {
  switch (msg.type) {
    case 'join_ack':
      playerId = msg.payload.id;
      if (!joined) {
        joinScreen.style.display = 'none';
        joined = true;
        input.start();
      }
      if (msg.payload.highScores) {
        ui.showHighScores(msg.payload.highScores);
      }
      break;
    case 'state':
      gameState = msg.payload;
      const own = gameState.snakes?.find(s => s.id === playerId);
      if (own) {
        input.updateCurrentDirection(own.direction);
        ui.updateScore(own.score || 0);
      }
      ui.updateLeaderboard(gameState.leaderboard);
      ui.drawMinimap(gameState.snakes, gameState.food, playerId);
      break;
    case 'death':
      ui.showDeath(msg.payload.score || 0);
      break;
    case 'respawn':
      ui.hideDeath();
      break;
    case 'player_count':
      ui.updatePlayerCount(msg.payload.count);
      break;
    case 'error':
      alert(msg.payload.message || 'Error');
      break;
  }
}

function gameLoop() {
  if (joined) {
    renderer.render(gameState, playerId);
  }
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
