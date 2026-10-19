import { useCallback, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'tournament' | 'match' | 'payment' | 'system';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

// Only one mounted instance shows toasts for new notifications.
let toastOwnerId: string | null = null;

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  // Each hook instance needs its own channel: the header dropdown and the
  // notifications page are mounted at the same time, and reusing one channel
  // name crashed the page ("cannot add postgres_changes callbacks ... after subscribe()").
  const instanceId = useId().replace(/:/g, '');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // Fetch notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;

    if (!toastOwnerId) toastOwnerId = instanceId;

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Add to notifications list
          setNotifications(prev => (prev.some(n => n.id === newNotification.id) ? prev : [newNotification, ...prev]));
          setUnreadCount(prev => prev + 1);

          // Only the first mounted instance shows the toast, so it isn't duplicated
          if (toastOwnerId !== instanceId) return;
          toast.info(
            <div className="space-y-1">
              <p className="font-light text-sm">{newNotification.title}</p>
              <p className="text-xs text-muted-foreground font-light">
                {newNotification.message}
              </p>
            </div>,
            {
              duration: 5000,
            }
          );
        }
      )
      .subscribe();

    return () => {
      if (toastOwnerId === instanceId) toastOwnerId = null;
      supabase.removeChannel(channel);
    };
  }, [userId, instanceId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}
