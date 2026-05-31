import { supabase } from '@/db/supabase';

export async function createNotification(
  userId: string,
  type: 'tournament' | 'match' | 'payment' | 'system',
  title: string,
  message: string,
  link?: string
) {
  try {
    const { error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_link: link || null
    });

    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function notifyMatchReady(
  userId: string,
  tournamentId: string,
  tournamentName: string,
  opponentName: string
) {
  await createNotification(
    userId,
    'match',
    'Match Ready',
    `Your match against ${opponentName} in ${tournamentName} is ready to start`,
    `/tournaments/${tournamentId}`
  );
}

export async function notifyOpponentReady(
  userId: string,
  tournamentId: string,
  tournamentName: string,
  opponentName: string
) {
  await createNotification(
    userId,
    'match',
    'Opponent Ready',
    `${opponentName} has checked in and is ready for your match in ${tournamentName}`,
    `/tournaments/${tournamentId}`
  );
}

export async function notifyMatchResult(
  userId: string,
  tournamentId: string,
  tournamentName: string,
  opponentName: string
) {
  await createNotification(
    userId,
    'match',
    'Match Result Submitted',
    `${opponentName} has submitted a result for your match in ${tournamentName}`,
    `/tournaments/${tournamentId}`
  );
}

export async function notifyTournamentWinner(
  userId: string,
  tournamentId: string,
  tournamentName: string,
  prizeAmount: number
) {
  await createNotification(
    userId,
    'tournament',
    'Congratulations! You Won!',
    `You won ${tournamentName} and earned $${prizeAmount.toFixed(2)}!`,
    `/tournaments/${tournamentId}`
  );
}

export async function notifyTournamentStarting(
  userId: string,
  tournamentId: string,
  tournamentName: string,
  minutesUntilStart: number
) {
  const timeText = minutesUntilStart < 60 
    ? `${minutesUntilStart} minutes`
    : `${Math.floor(minutesUntilStart / 60)} hours`;

  await createNotification(
    userId,
    'tournament',
    'Tournament Starting Soon',
    `${tournamentName} starts in ${timeText}`,
    `/tournaments/${tournamentId}`
  );
}

export async function notifyPaymentReceived(
  userId: string,
  amount: number,
  description: string
) {
  await createNotification(
    userId,
    'payment',
    'Payment Received',
    `You received $${amount.toFixed(2)} - ${description}`,
    '/wallet'
  );
}
