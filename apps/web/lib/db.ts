import { createClient } from "@libsql/client"

export function getDB() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN

  if (!url || !token) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required")
  }

  return createClient({ url, authToken: token })
}

// 建表（幂等）
export async function initDB() {
  const db = getDB()
  await db.executeMultiple(`BEGIN;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS sync_words (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      spanish TEXT NOT NULL,
      chinese TEXT,
      part_of_speech TEXT,
      examples TEXT DEFAULT '[]',
      definition_es TEXT,
      conjugation TEXT,
      tags TEXT DEFAULT '[]',
      is_starred INTEGER DEFAULT 0,
      srs_state TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS user_streak (
      user_id TEXT PRIMARY KEY,
      streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_checkin_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS dict_cache (
      key TEXT PRIMARY KEY,
      spanish TEXT,
      chinese TEXT,
      definition_es TEXT,
      pos TEXT,
      article TEXT,
      feminine TEXT,
      examples TEXT DEFAULT '[]',
      conjugation TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  COMMIT;`)
}