import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'authority.sqlite');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS licensees (
      buyer_id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      stripe_account_id TEXT,
      subscription_status TEXT DEFAULT 'inactive',
      subscription_expires_at INTEGER,
      grace_period_end INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      last_verified_at INTEGER,
      compliance_score REAL DEFAULT 100.0
    );

    CREATE TABLE IF NOT EXISTS license_tokens (
      token_hash TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL REFERENCES licensees(buyer_id),
      hardware_id TEXT,
      issued_at INTEGER DEFAULT (unixepoch()),
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      version TEXT DEFAULT '2.0',
      UNIQUE(buyer_id, hardware_id)
    );

    CREATE TABLE IF NOT EXISTS revenue_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id TEXT NOT NULL REFERENCES licensees(buyer_id),
      stripe_event_id TEXT UNIQUE NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT DEFAULT 'usd',
      user_percent INTEGER NOT NULL,
      brand_percent INTEGER NOT NULL,
      user_amount INTEGER NOT NULL,
      brand_amount INTEGER NOT NULL,
      in_grace INTEGER DEFAULT 0,
      processed_at INTEGER DEFAULT (unixepoch()),
      stripe_transfer_id TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_chain (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      buyer_id TEXT,
      payload TEXT NOT NULL,
      previous_hash TEXT NOT NULL,
      current_hash TEXT NOT NULL,
      timestamp INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS kill_switch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      triggered_at INTEGER DEFAULT (unixepoch()),
      resolved_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_licensees_status ON licensees(subscription_status);
    CREATE INDEX IF NOT EXISTS idx_revenue_buyer ON revenue_events(buyer_id, processed_at);
    CREATE INDEX IF NOT EXISTS idx_audit_chain ON audit_chain(timestamp);
  `);
}

// ─── IMMUTABLE AUDIT CHAIN ───
// Each entry hashes the previous hash + current payload
// Tamper-evident: modifying any entry breaks the chain
export function appendAudit(
  eventType: string,
  buyerId: string | null,
  payload: Record<string, any>
): string {
  const db = getDb();

  // Get previous hash
  const prev = db.prepare('SELECT current_hash FROM audit_chain ORDER BY id DESC LIMIT 1').get() as 
    { current_hash: string } | undefined;
  const previousHash = prev?.current_hash || 'genesis';

  // Compute current hash: SHA256(prev_hash + event_type + buyer_id + payload_json + timestamp)
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
  const hashInput = `${previousHash}:${eventType}:${buyerId || 'system'}:${payloadJson}:${timestamp}`;
  const currentHash = crypto.createHash('sha256').update(hashInput).digest('hex');

  db.prepare(`
    INSERT INTO audit_chain (event_type, buyer_id, payload, previous_hash, current_hash, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(eventType, buyerId, payloadJson, previousHash, currentHash, timestamp);

  return currentHash;
}

export function verifyChain(): { valid: boolean; brokenAt?: number; expectedHash?: string; actualHash?: string } {
  const db = getDb();
  const entries = db.prepare('SELECT * FROM audit_chain ORDER BY id ASC').all() as any[];

  let previousHash = 'genesis';
  for (const entry of entries) {
    const hashInput = `${previousHash}:${entry.event_type}:${entry.buyer_id || 'system'}:${entry.payload}:${entry.timestamp}`;
    const expectedHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    if (expectedHash !== entry.current_hash) {
      return { 
        valid: false, 
        brokenAt: entry.id, 
        expectedHash, 
        actualHash: entry.current_hash 
      };
    }
    previousHash = entry.current_hash;
  }

  return { valid: true };
}
