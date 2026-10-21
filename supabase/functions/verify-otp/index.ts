import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '');
    const code = String(body.code || '');
    const purpose = String(body.purpose || 'signup');
    const markVerified = body.markVerified !== false;

    if (!email || !/^\d{6}$/.test(code.trim())) {
      throw new Error('Email and 6-digit code are required.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check and count the attempt in one locked step, so parallel guesses
    // can't each get the full attempt budget.
    const { data: result, error: checkError } = await supabaseAdmin.rpc('check_email_otp', {
      p_email: normalizedEmail,
      p_purpose: purpose,
      p_code: code.trim(),
      p_mark_verified: markVerified,
    });
    if (checkError) {
      console.error('Failed to check OTP:', checkError);
      throw new Error('Unable to verify code. Please try again.');
    }
    const messages: Record<string, string> = {
      missing: 'No active verification code found. Please request a new code.',
      expired: 'Verification code has expired. Please request a new one.',
      too_many: 'Too many failed attempts. Please request a new code.',
      invalid: 'Invalid verification code. Please try again.',
    };
    if (result !== 'ok') {
      throw new Error(messages[String(result)] || 'Unable to verify code. Please try again.');
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
