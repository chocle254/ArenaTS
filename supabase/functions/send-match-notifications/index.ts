import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'opponent_checked_in' | 'both_players_ready';
  matchId: string;
  tournamentId: string;
  player1Id: string;
  player2Id: string;
  tournamentName: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, matchId, tournamentId, player1Id, player2Id, tournamentName }: NotificationRequest = await req.json();

    const notifications = [];
    const emails = [];

    // Get player profiles
    const { data: player1Profile } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', player1Id)
      .single();

    const { data: player2Profile } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', player2Id)
      .single();

    if (type === 'opponent_checked_in') {
      // Notify the player whose opponent just checked in
      const { data: matchResult } = await supabase
        .from('match_results')
        .select('player1_checked_in, player2_checked_in')
        .eq('id', matchId)
        .single();

      if (matchResult) {
        let notifyUserId: string | null = null;
        let notifyProfile: any = null;
        let opponentName: string = '';

        if (matchResult.player2_checked_in && !matchResult.player1_checked_in) {
          notifyUserId = player1Id;
          notifyProfile = player1Profile;
          opponentName = player2Profile?.username || 'Your opponent';
        } else if (matchResult.player1_checked_in && !matchResult.player2_checked_in) {
          notifyUserId = player2Id;
          notifyProfile = player2Profile;
          opponentName = player1Profile?.username || 'Your opponent';
        }

        if (notifyUserId && notifyProfile) {
          // In-app notification
          notifications.push({
            user_id: notifyUserId,
            type: 'opponent_ready',
            title: 'Opponent is Ready',
            message: `${opponentName} has checked in. Don't miss your match!`,
            link: `/tournaments/${tournamentId}`,
            tournament_id: tournamentId,
          });

          // Email notification
          if (notifyProfile.email) {
            emails.push({
              to: notifyProfile.email,
              subject: `⚡ ${opponentName} is ready for your match!`,
              type: 'opponent_ready',
              tournamentName,
              opponentName,
              tournamentId,
              username: notifyProfile.username,
            });
          }
        }
      }
    } else if (type === 'both_players_ready') {
      // Notify both players that match is starting
      for (const [userId, profile] of [[player1Id, player1Profile], [player2Id, player2Profile]]) {
        if (profile) {
          // In-app notification
          notifications.push({
            user_id: userId,
            type: 'match_starting',
            title: 'Match Starting!',
            message: `Both players are ready. Your match in ${tournamentName} is starting now!`,
            link: `/tournaments/${tournamentId}`,
            tournament_id: tournamentId,
          });

          // Email notification
          if (profile.email) {
            emails.push({
              to: profile.email,
              subject: `🎮 Your match is starting now!`,
              type: 'match_starting',
              tournamentName,
              tournamentId,
              username: profile.username,
            });
          }
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error inserting notifications:', notifError);
      }
    }

    // Send all emails
    for (const emailData of emails) {
      try {
        await sendEmail(emailData, supabaseUrl);
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
        emailsSent: emails.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function sendEmail(emailData: any, supabaseUrl: string) {
  const { to, subject, type, tournamentName, opponentName, tournamentId, username } = emailData;
  
  const tournamentUrl = `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/tournaments/${tournamentId}`;
  
  const htmlContent = generateEmailHTML(type, tournamentName, opponentName, username, tournamentUrl);

  console.log('Email to send:', {
    to,
    subject,
    html: htmlContent,
  });

  // TODO: Integrate with actual email service
  return true;
}

function generateEmailHTML(type: string, tournamentName: string, opponentName: string | undefined, username: string, tournamentUrl: string): string {
  let title = '';
  let message = '';
  let buttonText = 'Go to Match';

  if (type === 'opponent_ready') {
    title = 'Opponent is Ready!';
    message = `${opponentName} has checked in for your match in ${tournamentName}. Don't keep them waiting!`;
    buttonText = 'Check In Now';
  } else if (type === 'match_starting') {
    title = 'Match Starting Now!';
    message = `Both players are ready. Your match in ${tournamentName} is starting now. Good luck!`;
    buttonText = 'Join Match';
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; background-color: #0a0a0f; color: #e5e5e5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: 2px;">ARENA</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #ffffff;">${title}</h2>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #a0a0a0;">
                Hi ${username || 'Player'},
              </p>
              
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #e5e5e5;">
                ${message}
              </p>
              
              <!-- Tournament Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px; background-color: #0f0f1a; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #a0a0a0; text-transform: uppercase; letter-spacing: 1px;">Tournament</p>
                    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #ffffff;">${tournamentName}</p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${tournamentUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; border-top: 1px solid #2a2a3e;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #a0a0a0;">
                Good luck and have fun!
              </p>
              <p style="margin: 0; font-size: 12px; color: #666;">
                ARENA Tournament Platform
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Unsubscribe -->
        <table role="presentation" style="max-width: 600px; margin: 20px auto 0;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666;">
                You're receiving this email because you're participating in a tournament on ARENA.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
