import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Bell, CheckCheck, CreditCard, Filter, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Notification, useNotifications } from '@/hooks/use-notifications';

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
  switch (type) {
    case 'tournament':
      return <Trophy className="h-5 w-5 text-blue-500" />;
    case 'match':
      return <Trophy className="h-5 w-5 text-violet-500" />;
    case 'payment':
      return <CreditCard className="h-5 w-5 text-indigo-500" />;
    case 'system':
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight">Notifications</h1>
          <p className="text-muted-foreground font-light">
            Stay updated with tournament and payment notifications
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={markAllAsRead}
            className="font-light"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Bell className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-light">{notifications.length}</p>
                <p className="text-sm text-muted-foreground font-light">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <Bell className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-light">{unreadCount}</p>
                <p className="text-sm text-muted-foreground font-light">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCheck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-light">{notifications.length - unreadCount}</p>
                <p className="text-sm text-muted-foreground font-light">Read</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-gradient-to-br from-blue-950/30 via-violet-950/30 to-blue-950/30 border border-blue-500/20">
          <TabsTrigger value="all" className="font-light">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="font-light">
            Unread ({unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {loading ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground font-light">Loading notifications...</p>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center space-y-4">
                <Bell className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-lg font-light mb-2">
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  </p>
                  <p className="text-sm text-muted-foreground font-light">
                    {filter === 'unread' 
                      ? "You're all caught up!" 
                      : "You'll see tournament updates and payment notifications here"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border-border/50 transition-all hover:border-border ${
                    !notification.read ? 'bg-muted/10' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    {notification.link ? (
                      <Link
                        to={notification.link}
                        onClick={() => handleNotificationClick(notification)}
                        className="block"
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            <NotificationIcon type={notification.type} />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-light text-base">
                                    {notification.title}
                                  </h3>
                                  {!notification.read && (
                                    <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground font-light">
                                  {notification.message}
                                </p>
                              </div>
                              <Badge variant="outline" className="font-light text-xs">
                                {notification.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground/70 font-light">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div
                        onClick={() => handleNotificationClick(notification)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            <NotificationIcon type={notification.type} />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-light text-base">
                                    {notification.title}
                                  </h3>
                                  {!notification.read && (
                                    <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground font-light">
                                  {notification.message}
                                </p>
                              </div>
                              <Badge variant="outline" className="font-light text-xs">
                                {notification.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground/70 font-light">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
