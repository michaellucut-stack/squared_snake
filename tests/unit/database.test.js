import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, saveScore, getTopScores, getPersonalBest, closeDatabase } from '../../server/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB = path.join(__dirname, '..', '..', 'data', 'test-scores.db');

describe('database', () => {
  beforeEach(() => {
    // Remove test db if exists
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
    initDatabase(TEST_DB);
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  it('initializes without error', () => {
    // Already initialized in beforeEach
    expect(true).toBe(true);
  });

  it('saves and retrieves scores', () => {
    saveScore('Alice', 100);
    saveScore('Bob', 200);

    const scores = getTopScores(10);
    expect(scores).toHaveLength(2);
    expect(scores[0].name).toBe('Bob');
    expect(scores[0].score).toBe(200);
    expect(scores[1].name).toBe('Alice');
    expect(scores[1].score).toBe(100);
  });

  it('does not save zero scores', () => {
    const result = saveScore('Alice', 0);
    expect(result).toBeNull();
    expect(getTopScores()).toHaveLength(0);
  });

  it('returns top scores in descending order', () => {
    saveScore('A', 10);
    saveScore('B', 50);
    saveScore('C', 30);

    const scores = getTopScores(10);
    expect(scores[0].score).toBe(50);
    expect(scores[1].score).toBe(30);
    expect(scores[2].score).toBe(10);
  });

  it('limits returned scores', () => {
    for (let i = 0; i < 20; i++) {
      saveScore(`Player${i}`, (i + 1) * 10);
    }

    const scores = getTopScores(5);
    expect(scores).toHaveLength(5);
    expect(scores[0].score).toBe(200);
  });

  it('gets personal best', () => {
    saveScore('Alice', 100);
    saveScore('Alice', 200);
    saveScore('Alice', 50);

    expect(getPersonalBest('Alice')).toBe(200);
  });

  it('returns 0 for unknown player personal best', () => {
    expect(getPersonalBest('Unknown')).toBe(0);
  });

  it('caps at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      saveScore(`Player${i}`, (i + 1) * 10);
    }

    const all = getTopScores(100);
    expect(all.length).toBeLessThanOrEqual(50);
  });
});
