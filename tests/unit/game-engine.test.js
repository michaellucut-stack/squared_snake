import { describe, it, expect, vi } from 'vitest';
import { createGameEngine } from '../../server/game-engine.js';
import { createGameState, addSnake } from '../../server/game-state.js';

// Helper: create a snake that moves every tick (speed=1.0)
function addFastSnake(state, id, name) {
  const snake = addSnake(state, id, name);
  snake.speed = 1.0;
  snake.moveAccumulator = 0;
  return snake;
}

describe('game-engine', () => {
  describe('createGameEngine', () => {
    it('returns object with start, stop, tick methods', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());

      expect(typeof engine.start).toBe('function');
      expect(typeof engine.stop).toBe('function');
      expect(typeof engine.tick).toBe('function');
    });
  });

  describe('tick', () => {
    it('increments state.tick', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());

      expect(state.tick).toBe(0);
      engine.tick();
      expect(state.tick).toBe(1);
      engine.tick();
      expect(state.tick).toBe(2);
    });

    it('calls broadcastFn', () => {
      const state = createGameState();
      const broadcastFn = vi.fn();
      const engine = createGameEngine(state, broadcastFn);

      engine.tick();
      expect(broadcastFn).toHaveBeenCalledWith(state);
    });

    it('moves snake right (default direction)', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      const initialHeadX = snake.segments[0][0];
      engine.tick();

      expect(snake.segments[0][0]).toBe(initialHeadX + 1);
      expect(snake.segments).toHaveLength(3);
    });

    it('moves snake in each direction correctly', () => {
      const directions = [
        { dir: 'up', axis: 1, delta: -1, segments: [[100, 100], [100, 101], [100, 102]] },
        { dir: 'down', axis: 1, delta: 1, segments: [[100, 100], [100, 99], [100, 98]] },
        { dir: 'left', axis: 0, delta: -1, segments: [[100, 100], [101, 100], [102, 100]] },
        { dir: 'right', axis: 0, delta: 1, segments: [[100, 100], [99, 100], [98, 100]] },
      ];

      for (const { dir, axis, delta, segments } of directions) {
        const state = createGameState();
        const engine = createGameEngine(state, vi.fn());
        const snake = addFastSnake(state, 'p1', 'Test');
        snake.segments = segments;
        snake.direction = dir;
        const initial = snake.segments[0][axis];
        engine.tick();
        if (snake.alive) {
          expect(snake.segments[0][axis]).toBe(initial + delta);
        }
      }
    });

    it('applies pendingDirection before moving', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.pendingDirection = 'up';
      const initialY = snake.segments[0][1];
      engine.tick();

      expect(snake.direction).toBe('up');
      expect(snake.segments[0][1]).toBe(initialY - 1);
    });

    it('maintains food count during tick', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      addFastSnake(state, 'player1', 'TestPlayer');

      expect(state.food).toHaveLength(0);
      engine.tick();
      expect(state.food.length).toBeGreaterThan(0);

      const foodCount = state.food.length;
      engine.tick();
      expect(state.food).toHaveLength(foodCount);
    });

    it('snake length remains constant after tick', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      expect(snake.segments).toHaveLength(3);
      engine.tick();
      expect(snake.segments).toHaveLength(3);
      engine.tick();
      expect(snake.segments).toHaveLength(3);
    });

    it('multiple ticks move snake correctly', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      const initialX = snake.segments[0][0];
      engine.tick();
      expect(snake.segments[0][0]).toBe(initialX + 1);
      engine.tick();
      expect(snake.segments[0][0]).toBe(initialX + 2);
      engine.tick();
      expect(snake.segments[0][0]).toBe(initialX + 3);
    });

    it('slow snake does not move every tick', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');
      // Default speed = 0.3

      const initialX = snake.segments[0][0];
      engine.tick(); // accumulator = 0.3 (no move)
      expect(snake.segments[0][0]).toBe(initialX);
      engine.tick(); // accumulator = 0.6 (no move)
      expect(snake.segments[0][0]).toBe(initialX);
      engine.tick(); // accumulator = 0.9 (no move)
      expect(snake.segments[0][0]).toBe(initialX);
      engine.tick(); // accumulator = 1.2 → move, accumulator = 0.2
      expect(snake.segments[0][0]).toBe(initialX + 1);
    });

    it('speed increases with food eaten', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[10, 10], [9, 10], [8, 10]];
      snake.direction = 'right';
      state.food = [[11, 10]];

      const initialSpeed = snake.speed;
      engine.tick();
      expect(snake.speed).toBe(initialSpeed + 0.05);
    });
  });

  describe('food', () => {
    it('initializes food on start', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());

      expect(state.food).toHaveLength(0);
      engine.start();
      expect(state.food.length).toBeGreaterThan(0);
      engine.stop();
    });

    it('snake grows when eating food', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[10, 10], [9, 10], [8, 10]];
      snake.direction = 'right';
      state.food = [[11, 10]];

      const initialLength = snake.segments.length;
      engine.tick(); // eats food, sets growing

      engine.tick(); // grows
      expect(snake.segments.length).toBe(initialLength + 1);
    });

    it('eating food increments score', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[10, 10], [9, 10], [8, 10]];
      snake.direction = 'right';
      state.food = [[11, 10]];

      expect(snake.score).toBe(0);
      engine.tick();
      expect(snake.score).toBe(1);
    });

    it('eaten food is replaced', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[10, 10], [9, 10], [8, 10]];
      snake.direction = 'right';
      state.food = [[11, 10]];

      engine.tick();

      expect(state.food.length).toBeGreaterThan(0);
      const foodAt1110 = state.food.find(f => f[0] === 11 && f[1] === 10);
      expect(foodAt1110).toBeUndefined();
    });

    it('multiple snakes can eat food simultaneously', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake1 = addFastSnake(state, 'p1', 'Player1');
      const snake2 = addFastSnake(state, 'p2', 'Player2');

      snake1.segments = [[10, 10], [9, 10], [8, 10]];
      snake1.direction = 'right';
      snake2.segments = [[20, 20], [19, 20], [18, 20]];
      snake2.direction = 'right';
      state.food = [[11, 10], [21, 20]];

      engine.tick();

      expect(snake1.score).toBe(1);
      expect(snake2.score).toBe(1);

      engine.tick();
      expect(snake1.segments.length).toBe(4);
      expect(snake2.segments.length).toBe(4);
    });
  });

  describe('collision', () => {
    it('snake dies hitting left wall', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[0, 100], [1, 100], [2, 100]];
      snake.direction = 'left';

      engine.tick();
      expect(snake.alive).toBe(false);
      expect(snake.segments).toHaveLength(0);
      expect(snake.deathTime).toBeTypeOf('number');
    });

    it('snake dies hitting right wall', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[199, 100], [198, 100], [197, 100]];
      snake.direction = 'right';

      engine.tick();
      expect(snake.alive).toBe(false);
    });

    it('snake dies hitting top wall', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[100, 0], [100, 1], [100, 2]];
      snake.direction = 'up';

      engine.tick();
      expect(snake.alive).toBe(false);
    });

    it('snake dies hitting bottom wall', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[100, 199], [100, 198], [100, 197]];
      snake.direction = 'down';

      engine.tick();
      expect(snake.alive).toBe(false);
    });

    it('snake dies on self-collision', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [
        [50, 50],
        [49, 50],
        [48, 50],
        [47, 50],
        [46, 50],
        [46, 51],
        [47, 51],
        [48, 51],
        [49, 51],
        [50, 51],
        [51, 51],
      ];
      snake.direction = 'down'; // Head moves to [50, 51]

      engine.tick();
      expect(snake.alive).toBe(false);
    });

    it('head-head collision kills both snakes', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake1 = addFastSnake(state, 'p1', 'Player1');
      const snake2 = addFastSnake(state, 'p2', 'Player2');

      snake1.segments = [[10, 10], [9, 10], [8, 10]];
      snake1.direction = 'right';
      snake2.segments = [[12, 10], [13, 10], [14, 10]];
      snake2.direction = 'left';

      engine.tick();

      expect(snake1.alive).toBe(false);
      expect(snake2.alive).toBe(false);
    });

    it('snake dies hitting another snake body', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake1 = addFastSnake(state, 'p1', 'Player1');
      const snake2 = addFastSnake(state, 'p2', 'Player2');

      snake1.segments = [[10, 10], [9, 10], [8, 10]];
      snake1.direction = 'right';
      snake2.segments = [[12, 10], [11, 10], [10, 11]];
      snake2.direction = 'down';

      engine.tick();

      expect(snake1.alive).toBe(false);
      expect(snake2.alive).toBe(true);
    });

    it('dead snakes do not cause collisions', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake1 = addFastSnake(state, 'p1', 'Player1');
      const snake2 = addFastSnake(state, 'p2', 'Player2');

      snake1.alive = false;
      snake1.segments = [];
      snake2.segments = [[10, 10], [9, 10], [8, 10]];
      snake2.direction = 'right';

      engine.tick();
      expect(snake2.alive).toBe(true);
    });
  });

  describe('respawn', () => {
    it('respawns after delay', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[0, 100], [1, 100], [2, 100]];
      snake.direction = 'left';
      engine.tick();
      expect(snake.alive).toBe(false);

      const deathTime = snake.deathTime;
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => deathTime + 3000);

      engine.tick();
      expect(snake.alive).toBe(true);
      expect(snake.segments.length).toBeGreaterThan(0);

      Date.now = originalDateNow;
    });

    it('does not respawn before delay', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[0, 100], [1, 100], [2, 100]];
      snake.direction = 'left';
      engine.tick();
      expect(snake.alive).toBe(false);

      const deathTime = snake.deathTime;
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => deathTime + 2000);

      engine.tick();
      expect(snake.alive).toBe(false);

      Date.now = originalDateNow;
    });

    it('respawned snake starts with score 0', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addFastSnake(state, 'player1', 'TestPlayer');

      snake.score = 10;
      snake.segments = [[0, 100], [1, 100], [2, 100]];
      snake.direction = 'left';
      engine.tick();

      const deathTime = snake.deathTime;
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => deathTime + 3000);

      engine.tick();
      expect(snake.alive).toBe(true);
      expect(snake.score).toBe(0);

      Date.now = originalDateNow;
    });
  });
});
