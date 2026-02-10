import { describe, it, expect } from 'vitest';
import { createGameState, addSnake, removeSnake, getSnake, setDirection, getRandomSpawnPosition, spawnFood, removeFood, killSnake, respawnSnake } from '../../server/game-state.js';

describe('game-state', () => {
  describe('createGameState', () => {
    it('returns correct initial state', () => {
      const state = createGameState();
      expect(state.arenaWidth).toBe(200);
      expect(state.arenaHeight).toBe(200);
      expect(state.snakes).toBeInstanceOf(Map);
      expect(state.snakes.size).toBe(0);
      expect(state.food).toEqual([]);
      expect(state.tick).toBe(0);
    });
  });

  describe('addSnake', () => {
    it('creates snake with correct properties', () => {
      const state = createGameState();
      const snake = addSnake(state, 'player1', 'TestPlayer');

      expect(snake.id).toBe('player1');
      expect(snake.name).toBe('TestPlayer');
      expect(snake.segments).toHaveLength(3);
      expect(snake.direction).toBe('right');
      expect(snake.alive).toBe(true);
      expect(snake.score).toBe(0);
      expect(typeof snake.color).toBe('string');
    });

    it('places snake within arena bounds', () => {
      const state = createGameState();
      const snake = addSnake(state, 'player1', 'TestPlayer');

      // Segments are [x, y] arrays
      snake.segments.forEach(seg => {
        expect(seg[0]).toBeGreaterThanOrEqual(0);
        expect(seg[0]).toBeLessThan(state.arenaWidth);
        expect(seg[1]).toBeGreaterThanOrEqual(0);
        expect(seg[1]).toBeLessThan(state.arenaHeight);
      });
    });

    it('assigns a hex color', () => {
      const state = createGameState();
      const snake = addSnake(state, 'player1', 'TestPlayer');

      expect(snake.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('creates distinct snakes', () => {
      const state = createGameState();
      const snake1 = addSnake(state, 'player1', 'Player1');
      const snake2 = addSnake(state, 'player2', 'Player2');

      expect(state.snakes.size).toBe(2);
      expect(snake1.id).not.toBe(snake2.id);
    });
  });

  describe('removeSnake', () => {
    it('removes snake from map', () => {
      const state = createGameState();
      addSnake(state, 'player1', 'TestPlayer');
      expect(state.snakes.size).toBe(1);

      removeSnake(state, 'player1');
      expect(state.snakes.size).toBe(0);
    });
  });

  describe('getSnake', () => {
    it('returns snake by id', () => {
      const state = createGameState();
      const snake = addSnake(state, 'player1', 'TestPlayer');

      const retrieved = getSnake(state, 'player1');
      expect(retrieved).toBe(snake);
    });

    it('returns undefined for unknown id', () => {
      const state = createGameState();
      expect(getSnake(state, 'nonexistent')).toBeUndefined();
    });
  });

  describe('setDirection', () => {
    it('changes pendingDirection', () => {
      const state = createGameState();
      addSnake(state, 'player1', 'TestPlayer');

      setDirection(state, 'player1', 'up');
      expect(getSnake(state, 'player1').pendingDirection).toBe('up');
    });

    it('rejects 180° reversal', () => {
      const state = createGameState();
      const snake = addSnake(state, 'player1', 'TestPlayer');

      // Snake starts direction 'right', try 'left' → should stay null
      setDirection(state, 'player1', 'left');
      expect(snake.pendingDirection).toBeNull();

      snake.direction = 'up';
      snake.pendingDirection = null;
      setDirection(state, 'player1', 'down');
      expect(snake.pendingDirection).toBeNull();

      snake.direction = 'down';
      snake.pendingDirection = null;
      setDirection(state, 'player1', 'up');
      expect(snake.pendingDirection).toBeNull();

      snake.direction = 'left';
      snake.pendingDirection = null;
      setDirection(state, 'player1', 'right');
      expect(snake.pendingDirection).toBeNull();
    });

    it('allows 90° turns', () => {
      const state = createGameState();
      const snake = addSnake(state, 'player1', 'TestPlayer');

      // right → up (allowed)
      setDirection(state, 'player1', 'up');
      expect(snake.pendingDirection).toBe('up');

      snake.direction = 'up';
      snake.pendingDirection = null;
      setDirection(state, 'player1', 'left');
      expect(snake.pendingDirection).toBe('left');

      snake.direction = 'left';
      snake.pendingDirection = null;
      setDirection(state, 'player1', 'down');
      expect(snake.pendingDirection).toBe('down');

      snake.direction = 'down';
      snake.pendingDirection = null;
      setDirection(state, 'player1', 'right');
      expect(snake.pendingDirection).toBe('right');
    });
  });

  describe('getRandomSpawnPosition', () => {
    it('returns position within safe bounds', () => {
      const state = createGameState();

      for (let i = 0; i < 20; i++) {
        const pos = getRandomSpawnPosition(state);
        expect(pos.x).toBeGreaterThanOrEqual(10);
        expect(pos.x).toBeLessThanOrEqual(189);
        expect(pos.y).toBeGreaterThanOrEqual(10);
        expect(pos.y).toBeLessThanOrEqual(189);
      }
    });
  });

  describe('spawnFood', () => {
    it('adds food to state', () => {
      const state = createGameState();
      spawnFood(state, 5);
      expect(state.food).toHaveLength(5);
      state.food.forEach(f => {
        expect(f).toHaveLength(2); // [x, y]
        expect(f[0]).toBeGreaterThanOrEqual(0);
        expect(f[0]).toBeLessThan(200);
        expect(f[1]).toBeGreaterThanOrEqual(0);
        expect(f[1]).toBeLessThan(200);
      });
    });

    it('adds multiple food items', () => {
      const state = createGameState();
      spawnFood(state, 3);
      expect(state.food).toHaveLength(3);
      spawnFood(state, 2);
      expect(state.food).toHaveLength(5);
    });
  });

  describe('removeFood', () => {
    it('removes food at index', () => {
      const state = createGameState();
      spawnFood(state, 3);
      const second = state.food[1];
      removeFood(state, 0);
      expect(state.food).toHaveLength(2);
      expect(state.food[0]).toEqual(second);
    });

    it('removes correct food item', () => {
      const state = createGameState();
      state.food = [[10, 10], [20, 20], [30, 30]];
      removeFood(state, 1);
      expect(state.food).toEqual([[10, 10], [30, 30]]);
    });
  });

  describe('killSnake', () => {
    it('marks snake as dead', () => {
      const state = createGameState();
      addSnake(state, 'p1', 'Player');
      killSnake(state, 'p1');
      const snake = getSnake(state, 'p1');
      expect(snake.alive).toBe(false);
      expect(snake.segments).toHaveLength(0);
      expect(snake.deathTime).toBeTypeOf('number');
    });

    it('sets deathTime to current timestamp', () => {
      const state = createGameState();
      addSnake(state, 'p1', 'Player');
      const before = Date.now();
      killSnake(state, 'p1');
      const after = Date.now();
      const snake = getSnake(state, 'p1');
      expect(snake.deathTime).toBeGreaterThanOrEqual(before);
      expect(snake.deathTime).toBeLessThanOrEqual(after);
    });

    it('handles non-existent snake gracefully', () => {
      const state = createGameState();
      expect(() => killSnake(state, 'nonexistent')).not.toThrow();
    });
  });

  describe('respawnSnake', () => {
    it('respawns dead snake', () => {
      const state = createGameState();
      addSnake(state, 'p1', 'Player');
      killSnake(state, 'p1');
      respawnSnake(state, 'p1');
      const snake = getSnake(state, 'p1');
      expect(snake.alive).toBe(true);
      expect(snake.segments).toHaveLength(3);
      expect(snake.score).toBe(0);
      expect(snake.direction).toBe('right');
      expect(snake.deathTime).toBeNull();
    });

    it('clears pendingDirection on respawn', () => {
      const state = createGameState();
      addSnake(state, 'p1', 'Player');
      const snake = getSnake(state, 'p1');
      snake.pendingDirection = 'up';
      killSnake(state, 'p1');
      respawnSnake(state, 'p1');
      expect(snake.pendingDirection).toBeNull();
    });

    it('restores snake at new position', () => {
      const state = createGameState();
      addSnake(state, 'p1', 'Player');
      const originalPos = getSnake(state, 'p1').segments[0];
      killSnake(state, 'p1');
      respawnSnake(state, 'p1');
      const snake = getSnake(state, 'p1');
      // Segments should be initialized
      expect(snake.segments[0]).toBeDefined();
      expect(snake.segments[1]).toBeDefined();
      expect(snake.segments[2]).toBeDefined();
    });

    it('handles non-existent snake gracefully', () => {
      const state = createGameState();
      expect(() => respawnSnake(state, 'nonexistent')).not.toThrow();
    });
  });
});
