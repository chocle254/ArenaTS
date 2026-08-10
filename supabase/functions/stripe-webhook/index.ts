import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  try {
    const body = await req.text();
    let event: Stripe.Event;

    // Production: Verify webhook signature
    if (!webhookSecret) {
      console.error('CRITICAL: STRIPE_WEBHOOK_SECRET is missing. Rejecting request for security.');
      return new Response('Webhook secret not configured', { status: 500 });
    }
    
    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }
    
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Webhook event:', event.type);

    // Idempotency guard: record the event ID first
    const { data: recordedEvent, error: eventRecordError } = await supabaseClient
      .from('stripe_webhook_events')
      .insert({ event_id: event.id, event_type: event.type })
      .select('id')
      .single();

    if (eventRecordError) {
      // Unique violation likely means this event was already processed
      if (eventRecordError.message?.includes('duplicate') || eventRecordError.code === '23505') {
        console.log(`Event ${event.id} already processed. Skipping.`);
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      throw new Error(`Failed to record webhook event: ${eventRecordError.message}`);
    }

    if (!recordedEvent) {
      throw new Error('Failed to record webhook event: no record returned');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const orderId = session.metadata?.order_id;
        const acAmount = session.metadata?.ac_amount;
        const purchaseType = session.metadata?.purchase_type || 'available';

        if (!userId) {
          console.error('No user_id in session metadata');
          break;
        }

        // Update order status
        if (orderId) {
          await supabaseClient
            .from('orders')
            .update({ status: 'completed' })
            .eq('id', orderId);
        }

        // All deposits via checkout are for Arena Currency (non-withdrawable).
        // withdrawable cash is only earned through tournament winnings/creator fees.
        if (purchaseType === 'arena_currency' && acAmount) {
          const ac = parseFloat(acAmount);
          const { data: acSuccess } = await supabaseClient.rpc('update_user_balance', {
            p_user_id: userId,
            p_amount: ac,
            p_balance_type: 'arena_currency',
          });

          if (!acSuccess) {
            throw new Error(`Failed to credit arena currency for user ${userId}: balance update rejected`);
          }

          // Create transaction record (idempotent via unique index)
          const { error: txError } = await supabaseClient.from('transactions').insert({
            user_id: userId,
            type: 'deposit',
            amount: ac,
            currency: 'AC',
            description: `Purchased Arena Currency (${acAmount} AC)`,
            status: 'completed',
            stripe_payment_intent_id: session.payment_intent as string,
            metadata: {
               stripe_session_id: session.id,
               purchase_type: 'arena_currency',
               order_id: orderId
            }
          });

          if (txError && !txError.message?.includes('duplicate')) {
            throw new Error(`Failed to record deposit transaction: ${txError.message}`);
          }

          console.log(`AC added for user ${userId}: ${acAmount} AC`);
        } else {
          // Legacy/other top-ups: still credit arena_currency only so users cannot
          // deposit cash and withdraw it for arbitrage.
          const acUnits = session.amount_total || 0;
          const { data: acSuccess } = await supabaseClient.rpc('update_user_balance', {
            p_user_id: userId,
            p_amount: acUnits,
            p_balance_type: 'arena_currency',
          });

          if (!acSuccess) {
            throw new Error(`Failed to credit arena currency for user ${userId}: balance update rejected`);
          }

          const { error: txError } = await supabaseClient.from('transactions').insert({
            user_id: userId,
            type: 'deposit',
            amount: acUnits,
            currency: 'AC',
            description: 'Purchased Arena Currency (legacy top-up)',
            status: 'completed',
            stripe_payment_intent_id: session.payment_intent as string,
            metadata: {
               stripe_session_id: session.id,
               purchase_type: purchaseType,
               order_id: orderId,
               usd_amount: acUnits / 100
            }
          });

          if (txError && !txError.message?.includes('duplicate')) {
            throw new Error(`Failed to record deposit transaction: ${txError.message}`);
          }

          console.log(`AC added for user ${userId}: ${acUnits} AC (legacy top-up)`);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const userId = paymentIntent.metadata.user_id;
        const purchaseType = paymentIntent.metadata?.purchase_type;
        // 1$ = 100 AC. amount is in cents. cents = AC units.
        const acUnits = paymentIntent.amount;

        // If it was a checkout session, we handle it in checkout.session.completed
        if (paymentIntent.metadata?.order_id) {
          console.log(`Payment intent ${paymentIntent.id} is part of a Checkout Session. Skipping balance update in this handler.`);
          break;
        }

        // Update transaction status
        await supabaseClient
          .from('transactions')
          .update({ status: 'completed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // Update user balance
        if (userId) {
          const { data: success } = await supabaseClient.rpc('update_user_balance', {
            p_user_id: userId,
            p_amount: acUnits,
            p_balance_type: purchaseType === 'arena_currency' ? 'arena_currency' : 'available',
          });
          if (!success) {
            console.error(`Failed to credit balance for user ${userId} after payment_intent.succeeded`);
          } else {
            console.log(`Payment succeeded for user ${userId}: ${acUnits} AC units (${purchaseType || 'available'})`);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Update transaction status
        await supabaseClient
          .from('transactions')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        console.log(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;

        // Update transaction status
        await supabaseClient
          .from('transactions')
          .update({ status: 'completed' })
          .eq('stripe_payout_id', payout.id);

        console.log(`Payout completed: ${payout.id}`);
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        const metadata = payout.metadata;
        const userId = metadata?.user_id;
        // 1$ = 100 AC. payout.amount is in cents. cents = AC units.
        const acUnits = payout.amount;

        // Update transaction status
        await supabaseClient
          .from('transactions')
          .update({ status: 'failed' })
          .eq('stripe_payout_id', payout.id);

        // Refund balance to user
        if (userId) {
          const { data: success } = await supabaseClient.rpc('update_user_balance', {
            p_user_id: userId,
            p_amount: acUnits,
            p_balance_type: 'available',
          });
          if (!success) {
            console.error(`Failed to refund balance to user ${userId} after payout.failed`);
          }
        }

        console.log(`Payout failed: ${payout.id}. Refunded ${acUnits} AC units to user ${userId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
