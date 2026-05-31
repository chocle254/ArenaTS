import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  status: string;
  game: string;
}

interface Participant {
  user_id: string;
  tournament_id: string;
  profiles?: {
    email: string;
    username: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Find tournaments starting in approximately 5 minutes (within 1 minute window)
    const { data: upcomingTournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('id, name, start_time, status, game')
      .eq('status', 'open')
      .gte('start_time', now.toISOString())
      .lte('start_time', fiveMinutesFromNow.toISOString());

    if (tournamentsError) {
      throw tournamentsError;
    }

    const notifications = [];
    const emails = [];

    // Send 5-minute warning notifications
    for (const tournament of upcomingTournaments || []) {
      const { data: participants, error: participantsError } = await supabase
        .from('tournament_participants')
        .select(`
          user_id,
          tournament_id,
          profiles:user_id (
            email,
            username
          )
        `)
        .eq('tournament_id', tournament.id);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        continue;
      }

      for (const participant of participants || []) {
        // Create in-app notification
        notifications.push({
          user_id: participant.user_id,
          type: 'tournament_starting',
          title: 'Tournament Starting Soon',
          message: `${tournament.name} starts in 5 minutes! Get ready to compete.`,
          link: `/tournaments/${tournament.id}`,
          tournament_id: tournament.id,
        });

        // Prepare email
        if (participant.profiles?.email) {
          emails.push({
            to: participant.profiles.email,
            subject: `🎮 ${tournament.name} starts in 5 minutes!`,
            tournament,
            participant: participant.profiles,
            type: 'tournament_starting',
          });
        }
      }
    }

    // Find tournaments that should be going live now
    const { data: liveTournaments, error: liveError } = await supabase
      .from('tournaments')
      .select('id, name, start_time, status, game')
      .eq('status', 'open')
      .lte('start_time', now.toISOString());

    if (liveError) {
      throw liveError;
    }

    // Update tournament status to active and notify participants
    for (const tournament of liveTournaments || []) {
      // Update tournament status
      await supabase
        .from('tournaments')
        .update({ status: 'active' })
        .eq('id', tournament.id);

      const { data: participants, error: participantsError } = await supabase
        .from('tournament_participants')
        .select(`
          user_id,
          tournament_id,
          profiles:user_id (
            email,
            username
          )
        `)
        .eq('tournament_id', tournament.id);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        continue;
      }

      for (const participant of participants || []) {
        // Create in-app notification
        notifications.push({
          user_id: participant.user_id,
          type: 'tournament_live',
          title: 'Tournament is LIVE!',
          message: `${tournament.name} is now live! Check in for your match now.`,
          link: `/tournaments/${tournament.id}`,
          tournament_id: tournament.id,
        });

        // Prepare email
        if (participant.profiles?.email) {
          emails.push({
            to: participant.profiles.email,
            subject: `🔴 LIVE: ${tournament.name} has started!`,
            tournament,
            participant: participant.profiles,
            type: 'tournament_live',
          });
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
  const { to, subject, tournament, participant, type } = emailData;
  
  const tournamentUrl = `${supabaseUrl.replace('supabase.co', 'supabase.co')}/tournaments/${tournament.id}`;
  
  const htmlContent = generateEmailHTML(tournament, participant, type, tournamentUrl);

  // Using a simple email service - you would replace this with your actual email service
  // For now, we'll log it (in production, use SendGrid, Resend, or similar)
  console.log('Email to send:', {
    to,
    subject,
    html: htmlContent,
  });

  // TODO: Integrate with actual email service
  // Example with Resend:
  // const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  // const res = await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${RESEND_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     from: 'ARENA <notifications@arena.com>',
  //     to: [to],
  //     subject: subject,
  //     html: htmlContent,
  //   }),
  // });

  return true;
}

function generateEmailHTML(tournament: Tournament, participant: any, type: string, tournamentUrl: string): string {
  const title = type === 'tournament_starting' 
    ? 'Tournament Starting Soon' 
    : 'Tournament is LIVE!';
  
  const message = type === 'tournament_starting'
    ? `${tournament.name} starts in 5 minutes! Get ready to compete.`
    : `${tournament.name} is now live! Check in for your match now.`;

  const buttonText = type === 'tournament_starting'
    ? 'View Tournament'
    : 'Check In Now';

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
                Hi ${participant.username || 'Player'},
              </p>
              
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #e5e5e5;">
                ${message}
              </p>
              
              <!-- Tournament Details -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px; background-color: #0f0f1a; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px; border-bottom: 1px solid #2a2a3e;">
                    <p style="margin: 0; font-size: 12px; color: #a0a0a0; text-transform: uppercase; letter-spacing: 1px;">Tournament</p>
                    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #ffffff;">${tournament.name}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #a0a0a0; text-transform: uppercase; letter-spacing: 1px;">Start Time</p>
                    <p style="margin: 4px 0 0; font-size: 16px; color: #e5e5e5;">${new Date(tournament.start_time).toLocaleString()}</p>
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
                You're receiving this email because you joined a tournament on ARENA.
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
