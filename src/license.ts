import { sign, verify } from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb, appendAudit } from './db';

const LICENSE_SECRET = process.env.LICENSE_SECRET!;
if (!LICENSE_SECRET || LICENSE_SECRET.length < 32) {
  throw new Error('LICENSE_SECRET must be 32+ characters');
}

export interface LicensePayload {
  buyerId: string;
  hardwareId: string;
  issuedAt: number;
  expiresAt: number;
  version: string;
  jti: string; // JWT ID for revocation tracking
}

export function generateHardwareFingerprint(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateLicense(buyerId: string, hardwareId?: string): string {
  const db = getDb();
  const hwId = hardwareId || generateHardwareFingerprint();
  const jti = crypto.randomBytes(16).toString('hex');

  const payload: LicensePayload = {
    buyerId,
    hardwareId: hwId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
    version: '2.0',
    jti,
  };

  const token = sign(payload, LICENSE_SECRET, { algorithm: 'HS256' });

  // Store hash in DB for instant revocation checks (no JWT verification needed for blacklist)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  db.prepare(`
    INSERT INTO license_tokens (token_hash, buyer_id, hardware_id, expires_at, version)
    VALUES (?, ?, ?, ?, ?)
  `).run(tokenHash, buyerId, hwId, Math.floor(payload.expiresAt / 1000), payload.version);

  appendAudit('LICENSE_ISSUED', buyerId, { hardwareId: hwId, jti, expiresAt: payload.expiresAt });

  return token;
}

export function verifyLicense(token: string): { 
  valid: boolean; 
  buyerId?: string; 
  error?: string;
  revoked?: boolean;
} {
  try {
    const decoded = verify(token, LICENSE_SECRET) as LicensePayload;
    const db = getDb();

    // Check revocation via DB (faster than JWT parsing for blacklist)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const revoked = db.prepare('SELECT revoked_at FROM license_tokens WHERE token_hash = ?').get(tokenHash) as 
      { revoked_at: number } | undefined;

    if (revoked?.revoked_at) {
      appendAudit('LICENSE_REVOKED_CHECK', decoded.buyerId, { reason: 'Token in revocation DB' });
      return { valid: false, error: 'License revoked - kill switch activated', revoked: true };
    }

    if (Date.now() > decoded.expiresAt) {
      return { valid: false, error: 'License expired' };
    }

    return { valid: true, buyerId: decoded.buyerId };
  } catch (error: any) {
    return { valid: false, error: 'Invalid license signature' };
  }
}

export function revokeLicense(buyerId: string, reason: string): void {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  db.prepare('UPDATE license_tokens SET revoked_at = ? WHERE buyer_id = ? AND revoked_at IS NULL')
    .run(now, buyerId);

  db.prepare('UPDATE licensees SET subscription_status = ? WHERE buyer_id = ?')
    .run('revoked', buyerId);

  db.prepare('INSERT INTO kill_switch_log (buyer_id, reason) VALUES (?, ?)')
    .run(buyerId, reason);

  appendAudit('KILL_SWITCH', buyerId, { reason, timestamp: Date.now() });
}

export function isRevoked(buyerId: string): boolean {
  const db = getDb();
  const activeTokens = db.prepare(`
    SELECT COUNT(*) as count FROM license_tokens 
    WHERE buyer_id = ? AND revoked_at IS NULL AND expires_at > ?
  `).get(buyerId, Math.floor(Date.now() / 1000)) as { count: number };

  return activeTokens.count === 0;
}
