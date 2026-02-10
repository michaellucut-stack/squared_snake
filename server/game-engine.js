import * as GameState from './game-state.js';
import { saveScore } from './database.js';

export function createGameEngine(state, broadcastFn) {
  let intervalId = null;
  const tickRate = 100;
  const RESPAWN_DELAY = 3000;
  const TARGET_FOOD = 15;

  function tick() {
    // 1. Apply pending directions
    for (const snake of state.snakes.values()) {
      if (snake.alive && snake.pendingDirection) {
        snake.direction = snake.pendingDirection;
        snake.pendingDirection = null;
      }
    }

    // 2. Move alive snakes (speed accumulator: only move when >= 1.0)
    for (const snake of state.snakes.values()) {
      if (!snake.alive) continue;

      snake.moveAccumulator += snake.speed;
      if (snake.moveAccumulator < 1.0) continue;
      snake.moveAccumulator -= 1.0;

      const head = snake.segments[0];
      let newX = head[0];
      let newY = head[1];

      switch (snake.direction) {
        case 'up': newY -= 1; break;
        case 'down': newY += 1; break;
        case 'left': newX -= 1; break;
        case 'right': newX += 1; break;
      }

      snake.segments.unshift([newX, newY]);

      if (snake.growing) {
        snake.growing = false;
      } else {
        snake.segments.pop();
      }
    }

    // 3. Check food consumption
    for (const snake of state.snakes.values()) {
      if (!snake.alive) continue;
      const [hx, hy] = snake.segments[0];

      for (let i = state.food.length - 1; i >= 0; i--) {
        if (state.food[i][0] === hx && state.food[i][1] === hy) {
          snake.growing = true;
          snake.score++;
          snake.speed += 0.05;
          GameState.removeFood(state, i);
          GameState.spawnFood(state, 1);
          break;
        }
      }
    }

    // 4. Collision detection using occupancy grid
    const grid = new Array(state.arenaWidth * state.arenaHeight).fill(null);

    // Mark body segments (not heads) in grid
    for (const snake of state.snakes.values()) {
      if (!snake.alive) continue;
      for (let i = 1; i < snake.segments.length; i++) {
        const [x, y] = snake.segments[i];
        if (x >= 0 && x < state.arenaWidth && y >= 0 && y < state.arenaHeight) {
          grid[y * state.arenaWidth + x] = snake.id;
        }
      }
    }

    // Check collisions for each alive snake's head
    const toDie = new Set();
    const aliveSnakes = [...state.snakes.values()].filter(s => s.alive);

    for (const snake of aliveSnakes) {
      const [hx, hy] = snake.segments[0];

      // Wall collision
      if (hx < 0 || hx >= state.arenaWidth || hy < 0 || hy >= state.arenaHeight) {
        toDie.add(snake.id);
        continue;
      }

      // Body collision (self or other)
      const cell = grid[hy * state.arenaWidth + hx];
      if (cell !== null) {
        toDie.add(snake.id);
      }
    }

    // Head-head collision: if two alive heads share same position, both die
    for (let i = 0; i < aliveSnakes.length; i++) {
      for (let j = i + 1; j < aliveSnakes.length; j++) {
        const a = aliveSnakes[i];
        const b = aliveSnakes[j];
        if (!a.alive || !b.alive) continue;
        if (a.segments[0][0] === b.segments[0][0] && a.segments[0][1] === b.segments[0][1]) {
          toDie.add(a.id);
          toDie.add(b.id);
        }
      }
    }

    // Kill snakes
    for (const id of toDie) {
      const dyingSnake = state.snakes.get(id);
      if (dyingSnake && dyingSnake.score > 0) {
        saveScore(dyingSnake.name, dyingSnake.score);
      }
      GameState.killSnake(state, id);
    }

    // 5. Handle respawns
    const now = Date.now();
    for (const snake of state.snakes.values()) {
      if (!snake.alive && snake.deathTime && (now - snake.deathTime >= RESPAWN_DELAY)) {
        GameState.respawnSnake(state, snake.id);
      }
    }

    // 6. Maintain food count
    if (state.food.length < TARGET_FOOD) {
      GameState.spawnFood(state, TARGET_FOOD - state.food.length);
    }

    // 7. Increment tick
    state.tick++;

    // 8. Broadcast
    broadcastFn(state);
  }

  function start() {
    if (intervalId) return;
    // Spawn initial food
    if (state.food.length === 0) {
      GameState.spawnFood(state, TARGET_FOOD);
    }
    intervalId = setInterval(tick, tickRate);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function queueDirection(id, direction) {
    GameState.setDirection(state, id, direction);
  }

  return { start, stop, tick, queueDirection };
}
