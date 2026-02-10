import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export function initDatabase(dbPath) {
  const resolvedPath = dbPath || path.join(__dirname, '..', 'data', 'snake.db');
  db = new Database(resolvedPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS high_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create index for faster queries
  db.exec(`CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores(score DESC)`);

  return db;
}

export function saveScore(name, score) {
  if (!db) return null;
  if (score <= 0) return null;

  // Only save if it qualifies for top 50
  const count = db.prepare('SELECT COUNT(*) as cnt FROM high_scores').get();
  if (count.cnt >= 50) {
    const lowest = db.prepare('SELECT MIN(score) as min_score FROM high_scores').get();
    if (score <= lowest.min_score) return null;

    // Remove the lowest score to make room
    db.prepare('DELETE FROM high_scores WHERE id = (SELECT id FROM high_scores ORDER BY score ASC LIMIT 1)').run();
  }

  const stmt = db.prepare('INSERT INTO high_scores (name, score) VALUES (?, ?)');
  const result = stmt.run(name, score);
  return result.lastInsertRowid;
}

export function getTopScores(limit = 10) {
  if (!db) return [];
  const stmt = db.prepare('SELECT name, score, created_at FROM high_scores ORDER BY score DESC LIMIT ?');
  return stmt.all(limit);
}

export function getPersonalBest(name) {
  if (!db) return null;
  const stmt = db.prepare('SELECT MAX(score) as best FROM high_scores WHERE name = ?');
  const result = stmt.get(name);
  return result?.best || 0;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
