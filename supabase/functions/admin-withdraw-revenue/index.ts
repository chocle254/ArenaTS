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
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing');
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

    // Verify caller is admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // The platform_settings.maintenance_balance is stored in USD dollars (e.g.
    // 1676.20 means $1,676.20). The amount sent from the frontend is in dollars.
    const amountDollars = Math.round(amount * 100) / 100;

    let transferId: string | null = null;

    // Check the platform's actual Stripe available balance before touching the
    // platform_revenue_withdrawals records. If funds are insufficient, reject.
    const balance = await stripe.balance.retrieve();
    const availableUSD = balance.available?.find((b: any) => b.currency === 'usd');
    const availableCents = availableUSD ? availableUSD.amount : 0;
    const requestedCents = Math.round(amountDollars * 100);
    console.log('Platform available balance (USD cents):', availableCents, 'requested:', requestedCents);

    if (availableCents < requestedCents) {
      throw new Error(
        'Platform has insufficient funds to process this withdrawal. The available Stripe balance is lower than the requested amount.'
      );
    }

    // Atomic deduct from platform revenue balance only after confirming Stripe has funds.
    const { data: deducted, error: deductError } = await supabaseAdmin.rpc(
      'withdraw_platform_revenue',
      { p_amount: amountDollars }
    );

    if (deductError || !deducted) {
      throw new Error(deductError?.message || 'Insufficient platform revenue balance');
    }

    try {
      // Move funds from the platform's Stripe balance to its bank account.
      // Stripe Payout amounts are in cents.
      const payout = await stripe.payouts.create({
        amount: requestedCents,
        currency: 'usd',
        metadata: {
          type: 'platform_revenue_withdrawal',
          usd_amount: amountDollars.toFixed(2),
        },
      });

      transferId = payout.id;
      console.log('Stripe payout created:', payout.id);
    } catch (stripeError: any) {
      console.error('Stripe payout failed:', stripeError);
      // Refund the deducted platform balance because Stripe could not complete the payout
      await supabaseAdmin.rpc('withdraw_platform_revenue', { p_amount: -amountDollars });
      throw new Error(stripeError?.message || 'Unable to process platform withdrawal');
    }

    // Record platform revenue withdrawal
    const { error: recordError } = await supabaseAdmin.from('platform_revenue_withdrawals').insert({
      amount: amountDollars,
      currency: 'USD',
      status: 'completed',
      stripe_transfer_id: transferId,
      metadata: {
        usd_amount: amountDollars,
        admin_user_id: user.id,
      },
    });

    if (recordError) {
      console.error('Failed to record platform revenue withdrawal:', recordError);
      throw new Error('Withdrawal succeeded but could not be recorded. Contact support.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        transferId,
        amount: amountDollars,
        usdAmount: amountDollars,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error withdrawing platform revenue:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
