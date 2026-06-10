import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'local.sqlite');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      status TEXT DEFAULT 'waitlist',
      created_at INTEGER DEFAULT (unixepoch()),
      synced_to_las INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS local_cache (
      key TEXT PRIMARY KEY,
      value TEXT,
      expires_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
  `);
}
