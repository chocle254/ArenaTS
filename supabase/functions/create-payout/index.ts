import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in Supabase project secrets.');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey ?? '', {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { amount: amountDollars, currency = 'usd' } = await req.json();

    if (!amountDollars || amountDollars <= 0) {
      throw new Error('Invalid amount');
    }

    // Round to 2 decimals to match the database column
    const amount = Math.round(amountDollars * 100) / 100;

    // Get user profile (read only - balance mutation is atomic below)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_account_id, currency')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      throw new Error('No payout account connected');
    }

    // Verify Connect account is active before we touch the balance
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    if (!account.payouts_enabled) {
      throw new Error('Payout account not fully set up. Please visit settings to complete onboarding.');
    }

    // Withdrawals come from available_balance (withdrawable cash), NOT arena_currency.
    // available_balance is stored in USD dollars.
    // Stripe transfers amount is in cents.
    const stripeAmountCents = Math.round(amount * 100);

    let transferId: string | null = null;

    // Check the platform's actual available balance before deducting the user.
    // If the platform has insufficient funds, the withdrawal is rejected immediately.
    const balance = await stripe.balance.retrieve();
    const availableUSD = balance.available?.find((b: any) => b.currency === 'usd');
    const availableCents = availableUSD ? availableUSD.amount : 0;
    console.log('Platform available balance (USD cents):', availableCents, 'requested:', stripeAmountCents);

    if (availableCents < stripeAmountCents) {
      throw new Error(
        'Platform has insufficient funds to process this withdrawal. Please try a smaller amount or contact support.'
      );
    }

    // Deduct the user's balance only after confirming the platform has funds.
    const { data: deducted, error: deductError } = await supabaseAdmin.rpc(
      'withdraw_available_balance',
      {
        p_user_id: user.id,
        p_amount: amount,
      }
    );

    if (deductError || !deducted) {
      throw new Error(deductError?.message || 'Insufficient available balance or concurrent withdrawal');
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: stripeAmountCents,
        currency: (currency || profile.currency || 'usd').toLowerCase(),
        destination: profile.stripe_connect_account_id,
        metadata: {
          user_id: user.id,
          type: 'withdrawal',
          usd_amount: amount.toFixed(2)
        },
      });
      transferId = transfer.id;
      console.log('Stripe transfer created:', transfer.id);
    } catch (stripeError: any) {
      console.error('Stripe transfer failed:', stripeError);
      // Refund the deducted balance because Stripe could not complete the transfer
      await supabaseAdmin.rpc('update_user_balance', {
        p_user_id: user.id,
        p_amount: amount,
        p_balance_type: 'available',
      });
      throw new Error(
        stripeError?.message ||
          'Unable to process withdrawal. Please try again or contact support.'
      );
    }

    // Create transaction record (idempotent via unique index on stripe_payout_id)
    const { error: insertError } = await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount: amount,
      currency: 'USD',
      status: 'completed',
      stripe_payout_id: transferId,
      description: 'Withdrawal to payout account',
      metadata: {
        transfer_id: transferId,
        destination: profile.stripe_connect_account_id,
        usd_amount: amount,
      },
    });

    if (insertError) {
      console.error('Failed to record withdrawal transaction:', insertError);
      // Do not refund the balance here; the deduction succeeded. A missing record
      // is a data inconsistency that should be fixed by support.
      throw new Error('Withdrawal succeeded but could not be recorded. Contact support.');
    }

    // Also insert into the withdrawals table so it appears in order history
    const { error: withdrawalRecordError } = await supabaseAdmin.from('withdrawals').insert({
      user_id: user.id,
      amount: amount,
      currency: 'USD',
      status: 'completed',
      stripe_transfer_id: transferId,
      metadata: {
        destination: profile.stripe_connect_account_id,
        usd_amount: amount,
      },
    });

    if (withdrawalRecordError) {
      console.error('Failed to record withdrawal row:', withdrawalRecordError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transferId,
        amount: amount,
        usdAmount: amount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating payout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
