import { NextRequest, NextResponse } from 'next/server';
import { verifyLicense, isRevoked } from '@/src/license';
import { getSubscriptionStatus, calculateComplianceScore } from '@/src/subscription';
import { appendAudit } from '@/src/db';

export async function POST(req: NextRequest) {
  try {
    const { licenseToken, hardwareFingerprint, appVersion } = await req.json();

    if (!licenseToken) {
      appendAudit('LICENSE_CHECK_FAILED', null, { reason: 'Missing token', hardwareFingerprint });
      return NextResponse.json({
        valid: false,
        killSwitch: true,
        reason: 'No license token provided',
        action: 'TERMINATE_IMMEDIATELY',
        timestamp: Date.now(),
      }, { status: 401 });
    }

    // 1. Cryptographic verification
    const license = verifyLicense(licenseToken);
    if (!license.valid) {
      appendAudit('LICENSE_CHECK_FAILED', license.buyerId || null, {
        reason: license.error,
        revoked: license.revoked,
        hardwareFingerprint
      });

      return NextResponse.json({
        valid: false,
        killSwitch: license.revoked || false,
        reason: license.error,
        action: license.revoked ? 'TERMINATE_IMMEDIATELY' : 'REAUTHENTICATE',
        timestamp: Date.now(),
      }, { status: 401 });
    }

    const buyerId = license.buyerId!;

    // 2. Check if globally revoked (independent of token validity)
    if (isRevoked(buyerId)) {
      appendAudit('KILL_SWITCH_CHECK', buyerId, { hardwareFingerprint, reason: 'Global revocation' });
      return NextResponse.json({
        valid: false,
        killSwitch: true,
        reason: 'License globally revoked by brand authority',
        action: 'TERMINATE_IMMEDIATELY',
        timestamp: Date.now(),
      }, { status: 403 });
    }

    // 3. Subscription status
    const sub = getSubscriptionStatus(buyerId);
    const complianceScore = calculateComplianceScore(buyerId);

    // 4. Compliance-based warnings (predictive enforcement)
    let warning: string | undefined;
    if (complianceScore < 50) {
      warning = `Compliance score critical: ${complianceScore}%. License under review.`;
    } else if (complianceScore < 70) {
      warning = `Compliance score warning: ${complianceScore}%. Verify integration integrity.`;
    }

    // 5. Update last verified timestamp
    const db = (await import('@/src/db')).getDb();
    db.prepare('UPDATE licensees SET last_verified_at = ? WHERE buyer_id = ?')
      .run(Math.floor(Date.now() / 1000), buyerId);

    appendAudit('LICENSE_CHECK_PASSED', buyerId, {
      hardwareFingerprint,
      appVersion,
      status: sub.status,
      complianceScore
    });

    return NextResponse.json({
      valid: true,
      subscriptionActive: sub.active,
      status: sub.status,
      splitRate: { user: sub.userPercent, brand: sub.brandPercent },
      inGrace: sub.inGrace,
      graceDaysRemaining: sub.graceDaysRemaining,
      complianceScore,
      warning,
      nextCheckInSeconds: 86400, // 24 hours
      timestamp: Date.now(),
    });

  } catch (error: any) {
    console.error('License verify error:', error);
    appendAudit('LICENSE_CHECK_ERROR', null, { error: error.message });
    return NextResponse.json({
      valid: false,
      killSwitch: false,
      reason: 'Server error during verification',
      action: 'RETRY_LATER',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}
