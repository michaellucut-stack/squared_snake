import { describe, it, expect } from 'vitest';
import { computeViewport, isInViewport, cullSnakes, cullFood, cullStateForPlayer } from '../../server/viewport.js';
import { createGameState, addSnake, spawnFood } from '../../server/game-state.js';

describe('viewport', () => {
  describe('computeViewport', () => {
    it('computes viewport centered on head', () => {
      const vp = computeViewport(100, 100);
      expect(vp.minX).toBe(75);
      expect(vp.maxX).toBe(125);
      expect(vp.minY).toBe(75);
      expect(vp.maxY).toBe(125);
    });

    it('allows custom halfSize', () => {
      const vp = computeViewport(50, 50, 10);
      expect(vp.minX).toBe(40);
      expect(vp.maxX).toBe(60);
    });

    it('viewport can extend beyond arena', () => {
      const vp = computeViewport(5, 5);
      expect(vp.minX).toBe(-20);
    });
  });

  describe('isInViewport', () => {
    it('returns true for point inside', () => {
      const vp = computeViewport(100, 100);
      expect(isInViewport(vp, 100, 100)).toBe(true);
      expect(isInViewport(vp, 75, 75)).toBe(true);
      expect(isInViewport(vp, 125, 125)).toBe(true);
    });

    it('returns false for point outside', () => {
      const vp = computeViewport(100, 100);
      expect(isInViewport(vp, 74, 100)).toBe(false);
      expect(isInViewport(vp, 126, 100)).toBe(false);
    });
  });

  describe('cullSnakes', () => {
    it('includes snakes with segments in viewport', () => {
      const vp = computeViewport(100, 100);
      const snakes = [
        { id: 'a', segments: [[100, 100], [99, 100]] },
        { id: 'b', segments: [[200, 200], [199, 200]] }, // outside
      ];
      const result = cullSnakes(snakes, vp);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
    });

    it('excludes snakes with no segments', () => {
      const vp = computeViewport(100, 100);
      const snakes = [{ id: 'a', segments: [] }];
      expect(cullSnakes(snakes, vp)).toHaveLength(0);
    });

    it('includes snake if any segment is in viewport', () => {
      const vp = computeViewport(100, 100);
      const snakes = [
        { id: 'a', segments: [[200, 200], [125, 100]] }, // 2nd segment in viewport
      ];
      expect(cullSnakes(snakes, vp)).toHaveLength(1);
    });
  });

  describe('cullFood', () => {
    it('includes food in viewport', () => {
      const vp = computeViewport(100, 100);
      const food = [[100, 100], [200, 200], [80, 90]];
      const result = cullFood(food, vp);
      expect(result).toHaveLength(2);
    });
  });

  describe('cullStateForPlayer', () => {
    it('returns culled state for alive player', () => {
      const state = createGameState();
      const snake = addSnake(state, 'p1', 'Player1');
      // Fix snake position
      snake.segments = [[100, 100], [99, 100], [98, 100]];

      // Add distant snake
      const farSnake = addSnake(state, 'p2', 'Player2');
      farSnake.segments = [[5, 5], [4, 5], [3, 5]];

      state.food = [[101, 100], [5, 5]];

      const culled = cullStateForPlayer(state, 'p1');
      expect(culled.tick).toBe(state.tick);
      expect(culled.snakes).toHaveLength(1); // only p1 visible
      expect(culled.food).toHaveLength(1); // only nearby food
      expect(culled.leaderboard).toBeDefined();
    });

    it('returns empty state for dead player', () => {
      const state = createGameState();
      const snake = addSnake(state, 'p1', 'Player1');
      snake.alive = false;
      snake.segments = [];

      const culled = cullStateForPlayer(state, 'p1');
      expect(culled.snakes).toHaveLength(0);
      expect(culled.food).toHaveLength(0);
    });

    it('includes leaderboard sorted by score', () => {
      const state = createGameState();
      const s1 = addSnake(state, 'p1', 'Alice');
      s1.score = 10;
      const s2 = addSnake(state, 'p2', 'Bob');
      s2.score = 50;
      const s3 = addSnake(state, 'p3', 'Charlie');
      s3.score = 30;

      // Position s1 so it can see
      s1.segments = [[100, 100], [99, 100], [98, 100]];

      const culled = cullStateForPlayer(state, 'p1');
      expect(culled.leaderboard[0].name).toBe('Bob');
      expect(culled.leaderboard[0].score).toBe(50);
      expect(culled.leaderboard[1].name).toBe('Charlie');
    });
  });
});
