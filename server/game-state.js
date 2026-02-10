const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#C06C84',
  '#6C5B7B', '#355C7D', '#99B898', '#FECEAB', '#E84A5F',
];

export function createGameState() {
  return {
    arenaWidth: 200,
    arenaHeight: 200,
    snakes: new Map(),
    food: [],
    tick: 0,
  };
}

export function addSnake(state, id, name) {
  const position = getRandomSpawnPosition(state);
  const color = COLOR_PALETTE[hashCode(id) % COLOR_PALETTE.length];

  const snake = {
    id,
    name,
    segments: [
      [position.x, position.y],
      [position.x - 1, position.y],
      [position.x - 2, position.y],
    ],
    direction: 'right',
    alive: true,
    score: 0,
    color,
    pendingDirection: null,
    deathTime: null,
    speed: 0.3,
    moveAccumulator: 0,
  };

  state.snakes.set(id, snake);
  return snake;
}

export function removeSnake(state, id) {
  state.snakes.delete(id);
}

export function getSnake(state, id) {
  return state.snakes.get(id);
}

export function setDirection(state, id, direction) {
  const snake = state.snakes.get(id);
  if (!snake || !snake.alive) {
    return;
  }

  // Validate not 180° reversal
  const opposites = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  };

  if (opposites[direction] === snake.direction) {
    return; // Invalid move
  }

  snake.pendingDirection = direction;
}

export function getRandomSpawnPosition(state) {
  const minDistance = 10;
  const x = minDistance + Math.floor(Math.random() * (state.arenaWidth - 2 * minDistance));
  const y = minDistance + Math.floor(Math.random() * (state.arenaHeight - 2 * minDistance));
  return { x, y };
}

export function spawnFood(state, count = 1) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * state.arenaWidth);
    const y = Math.floor(Math.random() * state.arenaHeight);
    state.food.push([x, y]);
  }
}

export function removeFood(state, index) {
  state.food.splice(index, 1);
}

export function killSnake(state, id) {
  const snake = state.snakes.get(id);
  if (snake) {
    snake.alive = false;
    snake.segments = [];
    snake.deathTime = Date.now();
  }
}

export function respawnSnake(state, id) {
  const snake = state.snakes.get(id);
  if (!snake) return;
  const pos = getRandomSpawnPosition(state);
  snake.segments = [
    [pos.x, pos.y],
    [pos.x - 1, pos.y],
    [pos.x - 2, pos.y],
  ];
  snake.direction = 'right';
  snake.pendingDirection = null;
  snake.alive = true;
  snake.score = 0;
  snake.deathTime = null;
  snake.speed = 0.3;
  snake.moveAccumulator = 0;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
