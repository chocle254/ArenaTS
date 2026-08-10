import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_ATTEMPTS = 5;

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { email, code, purpose = 'signup', markVerified = true } = await req.json();

    if (!email || !code || code.length !== 6) {
      throw new Error('Email and 6-digit code are required.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    // Find the most recent unverified code for this email/purpose
    const { data: otpRows, error: fetchError } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('purpose', purpose)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Failed to fetch OTP:', fetchError);
      throw new Error('Unable to verify code. Please try again.');
    }

    if (!otpRows || otpRows.length === 0) {
      throw new Error('No active verification code found. Please request a new code.');
    }

    const otp = otpRows[0];

    if (new Date(otp.expires_at) < new Date()) {
      throw new Error('Verification code has expired. Please request a new one.');
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new Error('Too many failed attempts. Please request a new code.');
    }

    // Increment attempts regardless of correctness
    const { error: attemptError } = await supabaseAdmin
      .from('email_otps')
      .update({ attempts: otp.attempts + 1 })
      .eq('id', otp.id);

    if (attemptError) {
      console.error('Failed to update OTP attempts:', attemptError);
    }

    if (otp.code !== normalizedCode) {
      throw new Error('Invalid verification code. Please try again.');
    }

    if (markVerified) {
      const { error: verifyError } = await supabaseAdmin
        .from('email_otps')
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq('id', otp.id);

      if (verifyError) {
        console.error('Failed to mark OTP verified:', verifyError);
        throw new Error('Verification succeeded but could not be finalized. Please try again.');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        email: normalizedEmail,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
