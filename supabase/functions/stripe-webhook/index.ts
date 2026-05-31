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

    // If webhook secret is not set (development), parse body directly
    // WARNING: This is insecure and should only be used for development/testing
    if (!webhookSecret) {
      console.warn('⚠️  WEBHOOK SECRET NOT SET - Running in development mode without signature verification');
      console.warn('⚠️  This is INSECURE and should only be used for testing');
      event = JSON.parse(body);
    } else {
      // Production: Verify webhook signature
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
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Webhook event:', event.type);

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

        // Update user balance based on purchase type
        if (purchaseType === 'arena_currency' && acAmount) {
          const ac = parseFloat(acAmount);
          await supabaseClient.rpc('update_user_balance', {
            p_user_id: userId,
            p_amount: ac,
            p_balance_type: 'arena_currency',
          });
          
          // Create transaction record
          await supabaseClient.from('transactions').insert({
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
          
          console.log(`AC added for user ${userId}: ${acAmount} AC`);
        } else {
          // 1$ = 100 AC. amount_total is in cents.
          // cents / 100 = USD. USD * 100 = AC units.
          // So cents = AC units.
          const acUnits = session.amount_total || 0;
          await supabaseClient.rpc('update_user_balance', {
            p_user_id: userId,
            p_amount: acUnits,
            p_balance_type: 'available',
          });

          // Create transaction record
          await supabaseClient.from('transactions').insert({
            user_id: userId,
            type: 'deposit',
            amount: acUnits,
            currency: 'USD',
            description: 'Account Top-up',
            status: 'completed',
            stripe_payment_intent_id: session.payment_intent as string,
            metadata: {
               stripe_session_id: session.id,
               purchase_type: 'available',
               order_id: orderId,
               usd_amount: acUnits / 100
            }
          });

          console.log(`Cash balance added for user ${userId}: ${acUnits} AC units ($${acUnits / 100})`);
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
          await supabaseClient.rpc('update_user_balance', {
            p_user_id: userId,
            p_amount: acUnits,
            p_balance_type: purchaseType === 'arena_currency' ? 'arena_currency' : 'available',
          });
          console.log(`Payment succeeded for user ${userId}: ${acUnits} AC units (${purchaseType || 'available'})`);
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
          await supabaseClient.rpc('update_user_balance', {
            p_user_id: userId,
            p_amount: acUnits,
            p_balance_type: 'available',
          });
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
