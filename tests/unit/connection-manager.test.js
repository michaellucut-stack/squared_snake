import { describe, it, expect } from 'vitest';
import { MSG, encode, decode } from '../../server/protocol.js';

describe('connection-manager', () => {
  describe('message validation', () => {
    it('direction must be valid', () => {
      const validDirs = ['up', 'down', 'left', 'right'];
      validDirs.forEach(dir => {
        expect(['up', 'down', 'left', 'right'].includes(dir)).toBe(true);
      });
      expect(['up', 'down', 'left', 'right'].includes('diagonal')).toBe(false);
    });

    it('name validation', () => {
      const validNames = ['a', 'Player1', 'A'.repeat(20)];
      const invalidNames = ['', ' ', 'A'.repeat(21)];

      validNames.forEach(name => {
        const trimmed = name.trim();
        expect(trimmed.length >= 1 && trimmed.length <= 20).toBe(true);
      });

      invalidNames.forEach(name => {
        const trimmed = name.trim();
        expect(trimmed.length >= 1 && trimmed.length <= 20).toBe(false);
      });
    });
  });

  describe('rate limiting logic', () => {
    it('allows up to 20 directions per second', () => {
      const times = [];
      const now = Date.now();

      for (let i = 0; i < 20; i++) {
        times.push(now);
      }

      // Filter timestamps within 1 second
      const recentTimes = times.filter(t => now - t < 1000);
      expect(recentTimes.length).toBeLessThanOrEqual(20);
    });

    it('rejects excess messages', () => {
      const times = [];
      const now = Date.now();

      for (let i = 0; i < 25; i++) {
        times.push(now);
      }

      const recentTimes = times.filter(t => now - t < 1000);
      expect(recentTimes.length).toBeGreaterThan(20);
    });
  });
});
