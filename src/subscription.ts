import { getDb, appendAudit } from './db';

const GRACE_PERIOD_DAYS = 14;

export interface SubscriptionStatus {
  active: boolean;
  inGrace: boolean;
  graceDaysRemaining: number;
  userPercent: number;
  brandPercent: number;
  status: 'active' | 'grace' | 'lapsed' | 'revoked';
}

export function getSubscriptionStatus(buyerId: string): SubscriptionStatus {
  const db = getDb();
  const licensee = db.prepare('SELECT * FROM licensees WHERE buyer_id = ?').get(buyerId) as {
    subscription_status: string;
    subscription_expires_at: number;
    grace_period_end: number;
  } | undefined;

  if (!licensee) {
    return {
      active: false,
      inGrace: false,
      graceDaysRemaining: 0,
      userPercent: 3,
      brandPercent: 97,
      status: 'lapsed'
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const isRevoked = licensee.subscription_status === 'revoked';
  const isActive = licensee.subscription_status === 'active' && (licensee.subscription_expires_at || 0) > now;
  const graceEnd = licensee.grace_period_end || 0;
  const inGrace = !isActive && graceEnd > now;
  const graceDaysRemaining = inGrace ? Math.ceil((graceEnd - now) / 86400) : 0;

  if (isRevoked) {
    return { active: false, inGrace: false, graceDaysRemaining: 0, userPercent: 0, brandPercent: 100, status: 'revoked' };
  }

  if (isActive || inGrace) {
    return {
      active: isActive,
      inGrace,
      graceDaysRemaining,
      userPercent: 94,
      brandPercent: 6,
      status: isActive ? 'active' : 'grace'
    };
  }

  return {
    active: false,
    inGrace: false,
    graceDaysRemaining: 0,
    userPercent: 3,
    brandPercent: 97,
    status: 'lapsed'
  };
}

export function activateSubscription(buyerId: string, expiresAt: number): void {
  const db = getDb();
  db.prepare(`
    UPDATE licensees 
    SET subscription_status = 'active', subscription_expires_at = ?, grace_period_end = NULL
    WHERE buyer_id = ?
  `).run(expiresAt, buyerId);

  appendAudit('SUBSCRIPTION_ACTIVATED', buyerId, { expiresAt });
}

export function startGracePeriod(buyerId: string): void {
  const db = getDb();
  const graceEnd = Math.floor(Date.now() / 1000) + (GRACE_PERIOD_DAYS * 86400);

  db.prepare(`
    UPDATE licensees 
    SET subscription_status = 'inactive', grace_period_end = ?
    WHERE buyer_id = ?
  `).run(graceEnd, buyerId);

  appendAudit('GRACE_STARTED', buyerId, { graceEnd, days: GRACE_PERIOD_DAYS });
}

export function lapseSubscription(buyerId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE licensees 
    SET subscription_status = 'lapsed', grace_period_end = NULL
    WHERE buyer_id = ?
  `).run(buyerId);

  appendAudit('SUBSCRIPTION_LAPSED', buyerId, { timestamp: Date.now() });
}

// ─── COMPLIANCE SCORE ALGORITHM ───
// Weighted scoring to detect tampering before it happens
export function calculateComplianceScore(buyerId: string): number {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  // Base score
  let score = 100;

  // Check license verification frequency (should be every 24h)
  const lastVerify = db.prepare('SELECT last_verified_at FROM licensees WHERE buyer_id = ?').get(buyerId) as 
    { last_verified_at: number } | undefined;
  if (lastVerify?.last_verified_at) {
    const hoursSinceVerify = (now - lastVerify.last_verified_at) / 3600;
    if (hoursSinceVerify > 48) score -= 20; // Penalty for not checking in
    if (hoursSinceVerify > 72) score -= 30;
  }

  // Check revenue reporting consistency
  const lastRevenue = db.prepare(`
    SELECT MAX(processed_at) as last FROM revenue_events WHERE buyer_id = ?
  `).get(buyerId) as { last: number } | undefined;
  if (lastRevenue?.last) {
    const daysSinceRevenue = (now - lastRevenue.last) / 86400;
    if (daysSinceRevenue > 7) score -= 10; // No revenue in 7 days is suspicious for active apps
  }

  // Check failed payment history
  const failures = db.prepare(`
    SELECT COUNT(*) as count FROM kill_switch_log WHERE buyer_id = ? AND resolved_at IS NULL
  `).get(buyerId) as { count: number };
  score -= failures.count * 15;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  db.prepare('UPDATE licensees SET compliance_score = ? WHERE buyer_id = ?').run(score, buyerId);

  return score;
}
