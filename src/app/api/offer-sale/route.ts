import { NextRequest, NextResponse } from 'next/server';
import { getDb, appendAudit } from '@/src/db';
import { getSubscriptionStatus } from '@/src/subscription';

export async function POST(req: NextRequest) {
  try {
    const { buyerId, proposedPrice, revenueLast12Months, userCount, reason, contactEmail } = await req.json();

    if (!buyerId || !proposedPrice || !contactEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sub = getSubscriptionStatus(buyerId);
    if (sub.status === 'revoked' || sub.status === 'lapsed') {
      return NextResponse.json({
        error: 'Cannot sell - subscription is inactive or revoked. Penalty already applies.',
        status: sub.status,
      }, { status: 400 });
    }

    const db = getDb();
    const offerId = `OFFER-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    db.prepare(`
      INSERT INTO sale_offers (id, buyer_id, proposed_price, revenue_last_12_months, user_count, status, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(offerId, buyerId, proposedPrice, revenueLast12Months || 0, userCount || 0, 'pending_review', reason || '');

    appendAudit('SALE_OFFER_SUBMITTED', buyerId, {
      offerId,
      proposedPrice,
      revenueLast12Months,
      userCount,
      contactEmail
    });

    // Send notification to brand (would integrate with Resend here)
    console.log(`[BRAND NOTIFICATION] New sale offer ${offerId} from ${buyerId} at $${proposedPrice}`);

    return NextResponse.json({
      message: 'Offer received. The brand will respond within 10 business days.',
      offerId,
      status: 'pending_review',
      nextSteps: [
        'Brand reviews financials',
        'Due diligence period (5 days)',
        'Negotiation or acceptance',
        'Asset transfer with user consent',
        'License termination and payment'
      ]
    });
  } catch (error: any) {
    console.error('Offer sale error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
