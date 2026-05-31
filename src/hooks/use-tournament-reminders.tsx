import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

interface DueReminder {
  reminder_id: string;
  tournament_id: string;
  tournament_name: string;
  start_time: string;
  reminder_type: '24h' | '1h' | '15m';
}

export function useTournamentReminders() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      try {
        const { data, error } = await supabase.rpc('get_due_reminders', {
          p_user_id: user.id
        });

        if (error) {
          console.error('Error checking reminders:', error);
          return;
        }

        const reminders = data as DueReminder[];

        // Show notifications for due reminders
        reminders.forEach(async (reminder) => {
          if (!reminder.reminder_type) return;

          const timeText = {
            '24h': '24 hours',
            '1h': '1 hour',
            '15m': '15 minutes'
          }[reminder.reminder_type];

          const startTime = new Date(reminder.start_time);
          const now = new Date();
          const diffMs = startTime.getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);

          let timeRemaining = '';
          if (diffHours >= 1) {
            timeRemaining = `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
          } else if (diffMins > 0) {
            timeRemaining = `in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
          } else {
            timeRemaining = 'now';
          }

          // Create notification in database
          await supabase.rpc('create_notification', {
            p_user_id: user.id,
            p_type: 'tournament',
            p_title: 'Tournament Reminder',
            p_message: `${reminder.tournament_name} is starting ${timeRemaining}`,
            p_link: `/tournaments/${reminder.tournament_id}`
          });

          // Mark reminder as sent
          await supabase.rpc('mark_reminder_sent', {
            p_reminder_id: reminder.reminder_id,
            p_reminder_type: reminder.reminder_type
          });
        });
      } catch (error) {
        console.error('Error in reminder check:', error);
      }
    };

    // Check immediately
    checkReminders();

    // Check every 5 minutes
    const interval = setInterval(checkReminders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);
}
