import { describe, it, expect, vi } from 'vitest';
import { createGameEngine } from '../../server/game-engine.js';
import { createGameState, addSnake } from '../../server/game-state.js';

describe('game-engine', () => {
  describe('createGameEngine', () => {
    it('returns object with start, stop, tick methods', () => {
      const state = createGameState();
      const broadcastFn = vi.fn();
      const engine = createGameEngine(state, broadcastFn);

      expect(typeof engine.start).toBe('function');
      expect(typeof engine.stop).toBe('function');
      expect(typeof engine.tick).toBe('function');
    });
  });

  describe('tick', () => {
    it('increments state.tick', () => {
      const state = createGameState();
      const broadcastFn = vi.fn();
      const engine = createGameEngine(state, broadcastFn);

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
      const broadcastFn = vi.fn();
      const engine = createGameEngine(state, broadcastFn);
      const snake = addSnake(state, 'player1', 'TestPlayer');

      const initialHeadX = snake.segments[0][0];
      engine.tick();

      expect(snake.segments[0][0]).toBe(initialHeadX + 1);
      expect(snake.segments).toHaveLength(3);
    });

    it('moves snake in each direction correctly', () => {
      // Test each direction in isolation
      const directions = [
        { dir: 'up', axis: 1, delta: -1, segments: [[100, 100], [100, 101], [100, 102]] },
        { dir: 'down', axis: 1, delta: 1, segments: [[100, 100], [100, 99], [100, 98]] },
        { dir: 'left', axis: 0, delta: -1, segments: [[100, 100], [101, 100], [102, 100]] },
        { dir: 'right', axis: 0, delta: 1, segments: [[100, 100], [99, 100], [98, 100]] },
      ];

      for (const { dir, axis, delta, segments } of directions) {
        const state = createGameState();
        const engine = createGameEngine(state, vi.fn());
        const snake = addSnake(state, 'p1', 'Test');
        snake.segments = segments;
        snake.direction = dir;
        const initial = snake.segments[0][axis];
        engine.tick();
        // Check snake is still alive
        if (snake.alive) {
          expect(snake.segments[0][axis]).toBe(initial + delta);
        }
      }
    });

    it('applies pendingDirection before moving', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');

      snake.pendingDirection = 'up';
      const initialY = snake.segments[0][1];
      engine.tick();

      expect(snake.direction).toBe('up');
      expect(snake.segments[0][1]).toBe(initialY - 1);
    });

    it('maintains food count during tick', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      addSnake(state, 'player1', 'TestPlayer');

      // Start with no food
      expect(state.food).toHaveLength(0);

      // First tick should spawn food
      engine.tick();
      expect(state.food.length).toBeGreaterThan(0);

      const foodCount = state.food.length;

      // Subsequent ticks should maintain food count
      engine.tick();
      expect(state.food).toHaveLength(foodCount);
    });

    it('snake length remains constant after tick', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');

      expect(snake.segments).toHaveLength(3);
      engine.tick();
      expect(snake.segments).toHaveLength(3);
      engine.tick();
      expect(snake.segments).toHaveLength(3);
    });

    it('multiple ticks move snake correctly', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');

      const initialX = snake.segments[0][0];
      engine.tick();
      expect(snake.segments[0][0]).toBe(initialX + 1);
      engine.tick();
      expect(snake.segments[0][0]).toBe(initialX + 2);
      engine.tick();
      expect(snake.segments[0][0]).toBe(initialX + 3);
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
      const snake = addSnake(state, 'player1', 'TestPlayer');

      // Position snake and place food directly ahead
      snake.segments = [[10, 10], [9, 10], [8, 10]];
      snake.direction = 'right';
      state.food = [[11, 10]];

      const initialLength = snake.segments.length;
      engine.tick(); // Snake eats food, sets growing flag

      // Growth happens on the next tick
      engine.tick();
      expect(snake.segments.length).toBe(initialLength + 1);
    });

    it('eating food increments score', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');

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
      const snake = addSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[10, 10], [9, 10], [8, 10]];
      snake.direction = 'right';
      state.food = [[11, 10]];

      engine.tick();

      // Food should still exist (old one removed, new one added)
      expect(state.food.length).toBeGreaterThan(0);
      // The food at [11, 10] should be gone
      const foodAt1110 = state.food.find(f => f[0] === 11 && f[1] === 10);
      expect(foodAt1110).toBeUndefined();
    });

    it('multiple snakes can eat food simultaneously', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake1 = addSnake(state, 'p1', 'Player1');
      const snake2 = addSnake(state, 'p2', 'Player2');

      snake1.segments = [[10, 10], [9, 10], [8, 10]];
      snake1.direction = 'right';
      snake2.segments = [[20, 20], [19, 20], [18, 20]];
      snake2.direction = 'right';
      state.food = [[11, 10], [21, 20]];

      engine.tick(); // Both snakes eat food

      expect(snake1.score).toBe(1);
      expect(snake2.score).toBe(1);

      // Growth happens on next tick
      engine.tick();
      expect(snake1.segments.length).toBe(4);
      expect(snake2.segments.length).toBe(4);
    });
  });

  describe('collision', () => {
    it('snake dies hitting left wall', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');

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
      const snake = addSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[199, 100], [198, 100], [197, 100]];
      snake.direction = 'right';

      engine.tick();
      expect(snake.alive).toBe(false);
    });

    it('snake dies hitting top wall', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[100, 0], [100, 1], [100, 2]];
      snake.direction = 'up';

      engine.tick();
      expect(snake.alive).toBe(false);
    });

    it('snake dies hitting bottom wall', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');

      snake.segments = [[100, 199], [100, 198], [100, 197]];
      snake.direction = 'down';

      engine.tick();
      expect(snake.alive).toBe(false);
    });

    it('snake dies on self-collision', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');

      // Create a snake in a tight configuration
      // Make it long enough that turning back will cause collision
      // Head at [50, 50], moving right
      snake.segments = [
        [50, 50], // head
        [49, 50],
        [48, 50],
        [48, 51],
        [49, 51],
        [50, 51],
        [51, 51],
        [51, 50], // this will be at body after head moves
        [51, 49],
      ];
      snake.direction = 'right';

      // After tick, head will be at [51, 50], and body segment at index 7 will be at [51, 50]
      // Wait, that won't work because the segment at [51, 50] shifts

      // Better approach: create a snake that's long and curved so head hits a body segment that won't shift away
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

      engine.tick(); // Head at [50, 51] collides with body segment at [50, 51]
      expect(snake.alive).toBe(false);
    });

    it('head-head collision kills both snakes', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake1 = addSnake(state, 'p1', 'Player1');
      const snake2 = addSnake(state, 'p2', 'Player2');

      // Position snakes to collide head-on
      snake1.segments = [[10, 10], [9, 10], [8, 10]];
      snake1.direction = 'right';
      snake2.segments = [[12, 10], [13, 10], [14, 10]];
      snake2.direction = 'left';

      engine.tick(); // Both heads move to [11, 10]

      expect(snake1.alive).toBe(false);
      expect(snake2.alive).toBe(false);
    });

    it('snake dies hitting another snake body', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake1 = addSnake(state, 'p1', 'Player1');
      const snake2 = addSnake(state, 'p2', 'Player2');

      // Position snake1 to move into snake2's body
      // Snake2's body segment (not head) is at [11, 10]
      snake1.segments = [[10, 10], [9, 10], [8, 10]];
      snake1.direction = 'right';
      snake2.segments = [[12, 10], [11, 10], [10, 11]]; // Body at [11, 10]
      snake2.direction = 'down';

      engine.tick(); // Snake1 head moves to [11, 10], collides with snake2 body

      expect(snake1.alive).toBe(false);
      expect(snake2.alive).toBe(true);
    });

    it('dead snakes do not cause collisions', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake1 = addSnake(state, 'p1', 'Player1');
      const snake2 = addSnake(state, 'p2', 'Player2');

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
      const snake = addSnake(state, 'player1', 'TestPlayer');

      // Kill the snake
      snake.segments = [[0, 100], [1, 100], [2, 100]];
      snake.direction = 'left';
      engine.tick();
      expect(snake.alive).toBe(false);

      const deathTime = snake.deathTime;

      // Mock Date.now to advance time by 3000ms
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => deathTime + 3000);

      engine.tick();
      expect(snake.alive).toBe(true);
      expect(snake.segments.length).toBeGreaterThan(0);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('does not respawn before delay', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');

      // Kill the snake
      snake.segments = [[0, 100], [1, 100], [2, 100]];
      snake.direction = 'left';
      engine.tick();
      expect(snake.alive).toBe(false);

      const deathTime = snake.deathTime;

      // Mock Date.now to advance time by only 2000ms (less than 3000ms)
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => deathTime + 2000);

      engine.tick();
      expect(snake.alive).toBe(false);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('respawned snake starts with score 0', () => {
      const state = createGameState();
      const engine = createGameEngine(state, vi.fn());
      const snake = addSnake(state, 'player1', 'TestPlayer');

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
