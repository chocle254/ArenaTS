import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Forgot password: the player proves they own the email with a 'reset' code
// (sent by send-otp), then we set the new password and sign out every device.
// Needs no login, so it is rate limited like send-otp.

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function clientIp(req: Request): string {
  return (req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'unknown').trim().slice(0, 64);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase environment variables are missing.');
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').toLowerCase().trim();
    const code = String(body.code || '').trim();
    const password = String(body.password || '');

    if (!email || email.length > 254 || !/^\d{6}$/.test(code)) {
      return reply({ error: 'Enter your email and the 6-digit code.' }, 400);
    }
    if (password.length < 6 || password.length > 72) {
      return reply({ error: 'Use a password with 6 to 72 characters.' }, 400);
    }

    const limits: [string, number, number][] = [
      [`reset:email:${email}`, 10, 60 * 60],
      [`reset:ip:${clientIp(req)}`, 30, 60 * 60],
    ];
    for (const [key, limit, windowSeconds] of limits) {
      const { data: allowed, error } = await admin.rpc('take_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
      if (error) throw new Error('Please try again in a moment.');
      if (!allowed) return reply({ error: 'Too many attempts. Wait a while and try again.' }, 429);
    }

    // Counts the attempt and locks the code after 5 wrong tries
    const { data: result, error: checkError } = await admin.rpc('check_email_otp', {
      p_email: email,
      p_purpose: 'reset',
      p_code: code,
      p_mark_verified: true,
    });
    if (checkError) throw new Error('Unable to check the code. Please try again.');
    const messages: Record<string, string> = {
      missing: 'No active reset code for this email. Request a new one.',
      expired: 'That code has expired. Request a new one.',
      too_many: 'Too many wrong tries. Request a new code.',
      invalid: 'That code is wrong. Check the email and try again.',
    };
    if (result !== 'ok') return reply({ error: messages[String(result)] || 'Unable to check the code.' }, 400);

    // The code is used up whatever happens next
    await admin.from('email_otps').delete().eq('email', email).eq('purpose', 'reset');

    const { data: userId, error: lookupError } = await admin.rpc('password_reset_user_id', { p_email: email });
    if (lookupError) throw new Error('Unable to reset the password. Please try again.');
    if (!userId) return reply({ error: 'No account uses this email.' }, 400);

    const { error: updateError } = await admin.auth.admin.updateUserById(userId as string, { password });
    if (updateError) {
      console.error('Password update failed:', updateError.message);
      return reply({ error: /weak|pwned|leaked/i.test(updateError.message) ? 'That password is too easy to guess. Pick another one.' : 'Unable to reset the password. Please try again.' }, 400);
    }

    // Anyone who had the old password is signed out everywhere
    const { error: revokeError } = await admin.rpc('revoke_user_sessions', { p_user: userId });
    if (revokeError) console.error('Session revoke failed:', revokeError.message);

    return reply({ success: true });
  } catch (error) {
    console.error('reset-password error:', error);
    return reply({ error: (error as Error).message || 'Unable to reset the password.' }, 400);
  }
});
