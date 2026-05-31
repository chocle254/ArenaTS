import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const { amount: acAmount, currency = 'usd' } = await req.json();

    if (!acAmount || acAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_account_id, arena_currency, currency')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      throw new Error('No payout account connected');
    }

    // Balance check: acAmount is in AC units, arena_currency is in AC units
    if ((profile.arena_currency || 0) < acAmount) {
      throw new Error('Insufficient balance');
    }

    // Verify Connect account is active
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    
    if (!account.payouts_enabled) {
      throw new Error('Payout account not fully set up. Please visit settings to complete onboarding.');
    }

    // 1$ = 100 AC. acAmount is in units. USD = acAmount / 100.
    // Stripe transfers amount is in cents. cents = USD * 100 = acAmount.
    const stripeAmountCents = Math.round(acAmount);

    // Create transfer to Connect account
    const transfer = await stripe.transfers.create({
      amount: stripeAmountCents, // acAmount units = USD * 100 = cents
      currency: (currency || profile.currency || 'usd').toLowerCase(),
      destination: profile.stripe_connect_account_id,
      metadata: {
        user_id: user.id,
        type: 'withdrawal',
        ac_amount: acAmount.toString(),
        usd_amount: (acAmount / 100).toFixed(2)
      },
    });

    // Deduct from user balance
    await supabaseAdmin.rpc('update_user_balance', {
      p_user_id: user.id,
      p_amount: -acAmount,
      p_balance_type: 'available',
    });

    // Create transaction record
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount: acAmount,
      currency: 'USD',
      status: 'completed',
      stripe_payout_id: transfer.id,
      description: 'Withdrawal to payout account',
      metadata: {
        transfer_id: transfer.id,
        destination: profile.stripe_connect_account_id,
        usd_amount: acAmount / 100
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        transferId: transfer.id,
        amount: acAmount,
        usdAmount: acAmount / 100,
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
