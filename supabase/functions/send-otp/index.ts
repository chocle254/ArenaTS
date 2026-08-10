import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const OTP_EXPIRY_MINUTES = 5;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function generateOTP(): string {
  // Cryptographically secure 6-digit code
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const code = (buffer[0] % 1_000_000).toString().padStart(6, '0');
  return code;
}

function arenaEmailTemplate(code: string, email: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Your ARENA Verification Code</title>
      <style>
        body { margin: 0; padding: 0; background-color: #08090E; color: #E5E7EB; font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .container { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
        .card { background: linear-gradient(180deg, #11121A 0%, #0B0C12 100%); border: 1px solid #1F2937; border-radius: 16px; padding: 36px 28px; text-align: center; }
        .logo { font-size: 32px; font-weight: 800; letter-spacing: 0.08em; background: linear-gradient(to right, #3B82F6, #9333EA, #3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px; }
        .tagline { color: #9CA3AF; font-size: 14px; margin-bottom: 28px; }
        .title { font-size: 20px; font-weight: 700; color: #F3F4F6; margin-bottom: 12px; }
        .body { font-size: 15px; line-height: 1.6; color: #D1D5DB; margin-bottom: 28px; }
        .code-box { display: inline-block; background: #0F1119; border: 1px solid #374151; border-radius: 10px; padding: 18px 32px; margin-bottom: 24px; }
        .code { font-size: 36px; font-weight: 800; letter-spacing: 0.18em; color: #F3F4F6; font-family: 'SF Mono', ui-monospace, monospace; }
        .expiry { font-size: 13px; color: #6B7280; margin-bottom: 28px; }
        .footer { font-size: 12px; color: #4B5563; margin-top: 28px; line-height: 1.5; }
        .divider { height: 1px; background: #1F2937; margin: 24px 0; }
        a { color: #60A5FA; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">ARENA</div>
          <div class="tagline">Compete. Win. Earn.</div>
          <div class="title">Verify your email</div>
          <div class="body">Enter the verification code below to complete your ARENA setup. If you didn't request this, you can safely ignore this email.</div>
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          <div class="expiry">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</div>
          <div class="divider"></div>
          <div class="footer">Sent to ${email}.<br>ARENA Gaming Platform — all withdrawals and KYC actions are protected by this verification.</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');
    const fromEmail = Deno.env.get('SMTP_FROM_EMAIL') || `Arena <${gmailUser}>`;
    if (!gmailUser || !gmailAppPassword) {
      throw new Error('Email service is not configured.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { email, purpose = 'signup' } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('A valid email address is required.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const code = generateOTP();

    // Clean up old unverified codes for this email to avoid confusion
    await supabaseAdmin
      .from('email_otps')
      .delete()
      .eq('email', normalizedEmail)
      .eq('purpose', purpose)
      .eq('verified', false);

    const { error: insertError } = await supabaseAdmin.from('email_otps').insert({
      email: normalizedEmail,
      code,
      purpose,
      verified: false,
      attempts: 0,
      expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      throw new Error('Unable to generate verification code. Please try again.');
    }

    // Send email via Gmail SMTP
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 587,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

    try {
      await client.send({
        from: fromEmail,
        to: normalizedEmail,
        subject: 'Your ARENA Verification Code',
        html: arenaEmailTemplate(code, normalizedEmail),
        // A few headers that help avoid spam-filter penalties on personal Gmail sending
        headers: {
          'Reply-To': gmailUser,
        },
      });
      await client.close();
    } catch (smtpError) {
      console.error('SMTP send error:', smtpError);
      // Rollback the stored code so the user can retry
      await supabaseAdmin.from('email_otps').delete().eq('email', normalizedEmail).eq('code', code);
      throw new Error('Unable to send verification email. Please try again.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent.',
        email: normalizedEmail,
        // Only return the last 2 digits for UI hint, never the full code
        hint: `••••${code.slice(4)}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error sending OTP:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
