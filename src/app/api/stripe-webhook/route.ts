import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { processRevenueSplit } from '@/src/revenue';
import { activateSubscription, startGracePeriod, lapseSubscription } from '@/src/subscription';
import { revokeLicense } from '@/src/license';
import { appendAudit } from '@/src/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    appendAudit('STRIPE_WEBHOOK_INVALID', null, { error: err.message });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const buyerId = paymentIntent.metadata?.buyer_id;

        if (!buyerId) {
          appendAudit('STRIPE_MISSING_BUYER', null, { paymentIntent: paymentIntent.id });
          return NextResponse.json({ error: 'Missing buyer_id in metadata' }, { status: 400 });
        }

        const amountCents = paymentIntent.amount_received;
        const result = await processRevenueSplit(buyerId, amountCents, paymentIntent.id);

        return NextResponse.json({ success: true, split: result });
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const buyerId = invoice.subscription_details?.metadata?.buyer_id || 
                       invoice.metadata?.buyer_id;

        if (buyerId && invoice.subscription) {
          const expiresAt = Math.floor(Date.now() / 1000) + (30 * 86400); // 30 days
          activateSubscription(buyerId, expiresAt);
          appendAudit('SUBSCRIPTION_PAID', buyerId, { invoiceId: invoice.id });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const buyerId = invoice.subscription_details?.metadata?.buyer_id || 
                       invoice.metadata?.buyer_id;

        if (buyerId) {
          startGracePeriod(buyerId);
          appendAudit('PAYMENT_FAILED', buyerId, { invoiceId: invoice.id, graceDays: 14 });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const buyerId = subscription.metadata?.buyer_id;

        if (buyerId) {
          lapseSubscription(buyerId);
          appendAudit('SUBSCRIPTION_CANCELLED', buyerId, { subscriptionId: subscription.id });
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        // Disputes indicate potential fraud - flag for review
        appendAudit('DISPUTE_CREATED', null, { disputeId: dispute.id, amount: dispute.amount });
        break;
      }

      default:
        appendAudit('STRIPE_WEBHOOK_IGNORED', null, { eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    appendAudit('STRIPE_WEBHOOK_ERROR', null, { error: error.message, eventType: event.type });
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
