import { getDb, appendAudit } from './db';
import { getSubscriptionStatus } from './subscription';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export interface SplitResult {
  transactionId: string;
  buyerId: string;
  amountCents: number;
  userPercent: number;
  brandPercent: number;
  userAmount: number;
  brandAmount: number;
  inGrace: boolean;
  graceDaysRemaining: number;
  status: 'active' | 'grace' | 'lapsed' | 'revoked';
  stripeTransferId?: string;
}

export async function processRevenueSplit(
  buyerId: string,
  amountCents: number,
  stripePaymentIntentId: string
): Promise<SplitResult> {
  const db = getDb();
  const sub = getSubscriptionStatus(buyerId);

  // Prevent duplicate processing (idempotency)
  const existing = db.prepare('SELECT id FROM revenue_events WHERE stripe_event_id = ?').get(stripePaymentIntentId) as 
    { id: number } | undefined;
  if (existing) {
    throw new Error('Duplicate transaction: already processed');
  }

  const userPercent = sub.userPercent;
  const brandPercent = sub.brandPercent;

  // Integer math to avoid floating point errors
  const userAmount = Math.floor((amountCents * userPercent) / 100);
  const brandAmount = amountCents - userAmount; // Remainder to brand (handles rounding)

  // Execute Stripe Connect transfers
  let stripeTransferId: string | undefined;

  try {
    const licensee = db.prepare('SELECT stripe_account_id FROM licensees WHERE buyer_id = ?').get(buyerId) as 
      { stripe_account_id: string } | undefined;

    if (licensee?.stripe_account_id && userAmount > 0) {
      const transfer = await stripe.transfers.create({
        amount: userAmount,
        currency: 'usd',
        destination: licensee.stripe_account_id,
        transfer_group: stripePaymentIntentId,
        metadata: {
          buyer_id: buyerId,
          split_type: sub.status,
          brand_percent: String(brandPercent),
        },
      });
      stripeTransferId = transfer.id;
    }

    // Brand portion stays in platform account (already there from Stripe charge)
    // No transfer needed for brand - it's the platform owner
  } catch (stripeError: any) {
    appendAudit('STRIPE_TRANSFER_FAILED', buyerId, {
      error: stripeError.message,
      amountCents,
      stripePaymentIntentId
    });
    throw new Error(`Stripe transfer failed: ${stripeError.message}`);
  }

  // Record in database
  db.prepare(`
    INSERT INTO revenue_events 
    (buyer_id, stripe_event_id, amount_cents, user_percent, brand_percent, user_amount, brand_amount, in_grace, stripe_transfer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    buyerId,
    stripePaymentIntentId,
    amountCents,
    userPercent,
    brandPercent,
    userAmount,
    brandAmount,
    sub.inGrace ? 1 : 0,
    stripeTransferId || null
  );

  appendAudit('REVENUE_SPLIT', buyerId, {
    amountCents,
    userPercent,
    brandPercent,
    stripePaymentIntentId,
    status: sub.status
  });

  return {
    transactionId: stripePaymentIntentId,
    buyerId,
    amountCents,
    userPercent,
    brandPercent,
    userAmount,
    brandAmount,
    inGrace: sub.inGrace,
    graceDaysRemaining: sub.graceDaysRemaining,
    status: sub.status,
    stripeTransferId,
  };
}

export function getRevenueSummary(buyerId: string, days: number = 30): {
  totalRevenue: number;
  totalUserShare: number;
  totalBrandShare: number;
  transactionCount: number;
  averageSplit: number;
} {
  const db = getDb();
  const since = Math.floor(Date.now() / 1000) - (days * 86400);

  const result = db.prepare(`
    SELECT 
      COALESCE(SUM(amount_cents), 0) as total,
      COALESCE(SUM(user_amount), 0) as user_share,
      COALESCE(SUM(brand_amount), 0) as brand_share,
      COUNT(*) as count
    FROM revenue_events
    WHERE buyer_id = ? AND processed_at > ?
  `).get(buyerId, since) as {
    total: number;
    user_share: number;
    brand_share: number;
    count: number;
  };

  return {
    totalRevenue: result.total,
    totalUserShare: result.user_share,
    totalBrandShare: result.brand_share,
    transactionCount: result.count,
    averageSplit: result.count > 0 ? result.total / result.count : 0,
  };
}
