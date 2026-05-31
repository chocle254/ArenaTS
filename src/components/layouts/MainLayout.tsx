import {
  Coins,
  Globe, 
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Play,
  Search,
  Settings,
  Swords,
  Trophy,
  User,
  Users,
  Wallet,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { FeedbackModal } from '@/components/FeedbackModal';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/contexts/DirectMessageContext';
import { useWorldChat } from '@/contexts/WorldChatContext';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { formatArenaCurrency } from '@/lib/arena-currency';

const navigation = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Tournaments', href: '/tournaments', icon: Trophy },
  { name: 'Quick Match', href: '/quick-match', icon: Swords },
  { name: 'Streaming Lounge', href: '/streams', icon: Play },
  { name: 'World Chat', href: '/world-chat', icon: Globe },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Friends', href: '/friends', icon: Users },
];

const accountNavigation = [
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Leaderboard', href: '/leaderboard', icon: Users },
  { name: 'Exchange Rates', href: '/exchange-rates', icon: Globe },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { unreadCount: worldChatUnread } = useWorldChat();
  const { unreadTotal: dmUnread, pendingRequests } = useDirectMessages();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Initialize heartbeat
  useHeartbeat();

  const arenaCurrency = profile?.arena_currency !== undefined ? profile.arena_currency : 5000;
  const feedbackSubmitted = profile?.feedback_submitted || false;

  // Check if user has depleted currency and hasn't submitted feedback
  useEffect(() => {
    if (user && profile && profile.arena_currency !== undefined && profile.arena_currency <= 0 && !feedbackSubmitted) {
      setFeedbackModalOpen(true);
    }
  }, [user, profile, feedbackSubmitted]);

  // Check if we're on the landing page
  const isLandingPage = location.pathname === '/' || location.pathname === '';

  // If on landing page, render children without layout
  if (isLandingPage) {
    return <>{children}</>;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      // Use navigate with replace to avoid full page reload and white screen
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-x-hidden">
      {/* Full Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{
          backgroundImage: 'url(https://miaoda-site-img.s3cdn.medo.dev/images/KLing_1f3b06bb-cab6-4a8f-8663-85c5e3fb8d8a.jpg)'
        }}
      />
      
      {/* Background Overlays */}
      <div className="fixed inset-0 bg-gradient-to-r from-black via-black/70 to-black/30 -z-10" />
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/50 to-black/20 -z-10" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 -z-10" />
      <div className="fixed inset-0 bg-gradient-to-l from-black/60 via-transparent to-black/80 -z-10" />

      {/* Sidebar - Desktop Only */}
      <aside className="w-64 flex-shrink-0 fixed left-0 top-0 bottom-0 z-[60] hidden md:block">
        <div className="h-full glassmorphism-sidebar p-6 flex flex-col overflow-y-auto scrollbar-hide">
          {/* Logo */}
          <Link to={user ? "/dashboard" : "/"} className="mb-8">
            <h1 className="text-3xl font-display font-bold gradient-text">ARENA</h1>
          </Link>

          {/* Main Navigation */}
          <nav className="space-y-2 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              const showWorldChatBadge = item.name === 'World Chat' && worldChatUnread > 0;
              const showDMBadge = item.name === 'Messages' && dmUnread > 0;
              const showFriendsBadge = item.name === 'Friends' && pendingRequests.length > 0;
              
              let badgeCount = 0;
              if (item.name === 'World Chat') badgeCount = worldChatUnread;
              else if (item.name === 'Messages') badgeCount = dmUnread;
              else if (item.name === 'Friends') badgeCount = pendingRequests.length;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500 relative overflow-hidden group ${
                    isActive
                      ? 'text-white shadow-lg shadow-blue-500/30'
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {/* Active state - continuous slow gradient */}
                  {isActive && (
                    <div 
                      className="absolute inset-0 gradient-animate-slow"
                      style={{
                        background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 20%, #7c3aed 40%, #a855f7 50%, #7c3aed 60%, #4f46e5 80%, #2563eb 100%)'
                      }}
                    />
                  )}
                  {/* Hover state - continuous slow gradient */}
                  {!isActive && (
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 gradient-animate-slow"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, #2563eb 15%, #4f46e5 30%, #7c3aed 45%, #a855f7 50%, #7c3aed 55%, #4f46e5 70%, #2563eb 85%, transparent 100%)'
                      }}
                    />
                  )}
                  <Icon className="h-5 w-5 relative z-10" />
                  <span className="font-medium relative z-10">{item.name}</span>
                  {(showWorldChatBadge || showDMBadge || showFriendsBadge) && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center relative z-10">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </Badge>
                  )}
                </Link>
              );
            })}

            {/* Account Section */}
            <div className="pt-6 mt-6 border-t border-white/10">
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 mb-3">
                Account
              </p>

              {/* Arena Currency Display */}
              {user && (
                <div className="px-4 py-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-amber-400" />
                      <span className="text-xs text-muted-foreground">Arena Currency</span>
                    </div>
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-mono">
                      {formatArenaCurrency(arenaCurrency)}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-light">Demo Mode</p>
                </div>
              )}

              {accountNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500 relative overflow-hidden group ${
                      isActive
                        ? 'text-white shadow-lg shadow-blue-500/30'
                        : 'text-muted-foreground hover:text-white'
                    }`}
                  >
                    {/* Active state - continuous slow gradient */}
                    {isActive && (
                      <div 
                        className="absolute inset-0 gradient-animate-slow"
                        style={{
                          background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 20%, #7c3aed 40%, #a855f7 50%, #7c3aed 60%, #4f46e5 80%, #2563eb 100%)'
                        }}
                      />
                    )}
                    {/* Hover state - continuous slow gradient */}
                    {!isActive && (
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 gradient-animate-slow"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, #2563eb 15%, #4f46e5 30%, #7c3aed 45%, #a855f7 50%, #7c3aed 55%, #4f46e5 70%, #2563eb 85%, transparent 100%)'
                        }}
                      />
                    )}
                    <Icon className="h-5 w-5 relative z-10" />
                    <span className="font-medium relative z-10">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Referee Section - Visible to referees and admins */}
            {(profile?.role === 'referee' || profile?.role === 'admin') && (
              <div className="space-y-2 mt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 mb-3">
                  Referee
                </p>
                <Link
                  to="/referee"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500 relative overflow-hidden group ${
                    location.pathname === '/referee'
                      ? 'text-white shadow-lg shadow-blue-500/30'
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {/* Active state - continuous slow gradient */}
                  {location.pathname === '/referee' && (
                    <div 
                      className="absolute inset-0 gradient-animate-slow"
                      style={{
                        background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 20%, #7c3aed 40%, #a855f7 50%, #7c3aed 60%, #4f46e5 80%, #2563eb 100%)'
                      }}
                    />
                  )}
                  {/* Hover state - continuous slow gradient */}
                  {location.pathname !== '/referee' && (
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 gradient-animate-slow"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, #2563eb 15%, #4f46e5 30%, #7c3aed 45%, #a855f7 50%, #7c3aed 55%, #4f46e5 70%, #2563eb 85%, transparent 100%)'
                      }}
                    />
                  )}
                  <Users className="h-5 w-5 relative z-10" />
                  <span className="font-medium relative z-10">Control Center</span>
                </Link>
              </div>
            )}
            
            {/* Admin Section - Only visible to admins */}
            {profile?.role === 'admin' && (
              <div className="space-y-2 mt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 mb-3">
                  Admin
                </p>
                <Link
                  to="/admin"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500 relative overflow-hidden group ${
                    location.pathname === '/admin'
                      ? 'text-white shadow-lg shadow-blue-500/30'
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {/* Active state - continuous slow gradient */}
                  {location.pathname === '/admin' && (
                    <div 
                      className="absolute inset-0 gradient-animate-slow"
                      style={{
                        background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 20%, #7c3aed 40%, #a855f7 50%, #7c3aed 60%, #4f46e5 80%, #2563eb 100%)'
                      }}
                    />
                  )}
                  {/* Hover state - continuous slow gradient */}
                  {location.pathname !== '/admin' && (
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 gradient-animate-slow"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, #2563eb 15%, #4f46e5 30%, #7c3aed 45%, #a855f7 50%, #7c3aed 55%, #4f46e5 70%, #2563eb 85%, transparent 100%)'
                      }}
                    />
                  )}
                  <Settings className="h-5 w-5 relative z-10" />
                  <span className="font-medium relative z-10">Admin Control Center</span>
                </Link>
              </div>
            )}
          </nav>

          {/* User Profile & Auth */}
          <div className="mt-auto pt-4 border-t border-white/10 space-y-3">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-all duration-200"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.gamertag || 'User'} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {profile?.gamertag?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile?.gamertag || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                </Link>

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-red-400 hover:border-red-400/50 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </Button>
              </>
            ) : (
              <Link to="/sign-in">
                <Button variant="default" className="w-full">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Legal Links */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-2">
              <Link to="/privacy" className="text-[10px] text-muted-foreground hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-[10px] text-muted-foreground hover:text-white transition-colors">Terms & Conditions</Link>
              <span className="text-[10px] text-muted-foreground/50 w-full mt-1">© 2026 Nebula Dark LLC</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 overflow-x-hidden">
        {/* Top Bar */}
        <div className="sticky top-0 z-[60] glassmorphism-topbar">
          <div className="px-4 md:px-8 py-4 flex items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-gradient-to-b from-blue-600/20 via-purple-600/20 to-[#0a0a0f] border-r border-white/10 backdrop-blur-2xl">
                <div className="h-full p-6 flex flex-col overflow-y-auto scrollbar-hide">
                  {/* Logo */}
                  <Link to={user ? "/dashboard" : "/"} className="mb-8" onClick={() => setMobileMenuOpen(false)}>
                    <h1 className="text-3xl font-display font-bold gradient-text">ARENA</h1>
                  </Link>

                  {/* Main Navigation */}
                  <nav className="space-y-2 flex-1">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.href;
                      const showWorldChatBadge = item.name === 'World Chat' && worldChatUnread > 0;
                      const showDMBadge = item.name === 'Messages' && dmUnread > 0;
                      const showFriendsBadge = item.name === 'Friends' && pendingRequests.length > 0;
                      
                      let badgeCount = 0;
                      if (item.name === 'World Chat') badgeCount = worldChatUnread;
                      else if (item.name === 'Messages') badgeCount = dmUnread;
                      else if (item.name === 'Friends') badgeCount = pendingRequests.length;

                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500 relative overflow-hidden group ${
                            isActive
                              ? 'text-white shadow-lg shadow-blue-500/30'
                              : 'text-muted-foreground hover:text-white'
                          }`}
                        >
                          {isActive && (
                            <div 
                              className="absolute inset-0 gradient-animate-slow"
                              style={{
                                background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 20%, #7c3aed 40%, #a855f7 50%, #7c3aed 60%, #4f46e5 80%, #2563eb 100%)'
                              }}
                            />
                          )}
                          {!isActive && (
                            <div 
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 gradient-animate-slow"
                              style={{
                                background: 'linear-gradient(90deg, transparent 0%, #2563eb 15%, #4f46e5 30%, #7c3aed 45%, #a855f7 50%, #7c3aed 55%, #4f46e5 70%, #2563eb 85%, transparent 100%)'
                              }}
                            />
                          )}
                          <Icon className="h-5 w-5 relative z-10" />
                          <span className="font-light relative z-10">{item.name}</span>
                          {(showWorldChatBadge || showDMBadge || showFriendsBadge) && (
                            <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center relative z-10">
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}

                    {/* Account Section */}
                    <div className="pt-6 mt-6 border-t border-white/10">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 mb-3 font-light">
                        Account
                      </p>
                      {accountNavigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500 relative overflow-hidden group ${
                              isActive
                                ? 'text-white shadow-lg shadow-blue-500/30'
                                : 'text-muted-foreground hover:text-white'
                            }`}
                          >
                            {isActive && (
                              <div 
                                className="absolute inset-0 gradient-animate-slow"
                                style={{
                                  background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 20%, #7c3aed 40%, #a855f7 50%, #7c3aed 60%, #4f46e5 80%, #2563eb 100%)'
                                }}
                              />
                            )}
                            {!isActive && (
                              <div 
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 gradient-animate-slow"
                                style={{
                                  background: 'linear-gradient(90deg, transparent 0%, #2563eb 15%, #4f46e5 30%, #7c3aed 45%, #a855f7 50%, #7c3aed 55%, #4f46e5 70%, #2563eb 85%, transparent 100%)'
                                }}
                              />
                            )}
                            <Icon className="h-5 w-5 relative z-10" />
                            <span className="font-light relative z-10">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Referee Section - Visible to referees and admins */}
                    {(profile?.role === 'referee' || profile?.role === 'admin') && (
                      <div className="space-y-2 mt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 mb-3 font-light">
                          Referee
                        </p>
                        <Link
                          to="/referee"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500 relative overflow-hidden group ${
                            location.pathname === '/referee'
                              ? 'text-white shadow-lg shadow-blue-500/30'
                              : 'text-muted-foreground hover:text-white'
                          }`}
                        >
                          {location.pathname === '/referee' && (
                            <div 
                              className="absolute inset-0 gradient-animate-slow"
                              style={{
                                background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 20%, #7c3aed 40%, #a855f7 50%, #7c3aed 60%, #4f46e5 80%, #2563eb 100%)'
                              }}
                            />
                          )}
                          {location.pathname !== '/referee' && (
                            <div 
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 gradient-animate-slow"
                              style={{
                                background: 'linear-gradient(90deg, transparent 0%, #2563eb 15%, #4f46e5 30%, #7c3aed 45%, #a855f7 50%, #7c3aed 55%, #4f46e5 70%, #2563eb 85%, transparent 100%)'
                              }}
                            />
                          )}
                          <Users className="h-5 w-5 relative z-10" />
                          <span className="font-light relative z-10">Control Center</span>
                        </Link>
                      </div>
                    )}
                    
                    {/* Admin Section - Only visible to admins */}
                    {profile?.role === 'admin' && (
                      <div className="space-y-2 mt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 mb-3 font-light">
                          Admin
                        </p>
                        <Link
                          to="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500 relative overflow-hidden group ${
                            location.pathname === '/admin'
                              ? 'text-white shadow-lg shadow-blue-500/30'
                              : 'text-muted-foreground hover:text-white'
                          }`}
                        >
                          {location.pathname === '/admin' && (
                            <div 
                              className="absolute inset-0 gradient-animate-slow"
                              style={{
                                background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 20%, #7c3aed 40%, #a855f7 50%, #7c3aed 60%, #4f46e5 80%, #2563eb 100%)'
                              }}
                            />
                          )}
                          {location.pathname !== '/admin' && (
                            <div 
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 gradient-animate-slow"
                              style={{
                                background: 'linear-gradient(90deg, transparent 0%, #2563eb 15%, #4f46e5 30%, #7c3aed 45%, #a855f7 50%, #7c3aed 55%, #4f46e5 70%, #2563eb 85%, transparent 100%)'
                              }}
                            />
                          )}
                          <Users className="h-5 w-5 relative z-10" />
                          <span className="font-light relative z-10">Admin Control Center</span>
                        </Link>
                      </div>
                    )}
                  </nav>

                  {/* Sign Out Button */}
                  {user && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start gap-3 text-muted-foreground hover:text-white font-light"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-light">Sign Out</span>
                    </Button>
                  )}

                  {/* Legal Links - Mobile */}
                  <div className="mt-8 pt-6 border-t border-white/10 space-y-3 px-4">
                    <div className="flex flex-col gap-2">
                      <Link to="/privacy" onClick={() => setMobileMenuOpen(false)} className="text-xs text-muted-foreground hover:text-white transition-colors">Privacy Policy</Link>
                      <Link to="/terms" onClick={() => setMobileMenuOpen(false)} className="text-xs text-muted-foreground hover:text-white transition-colors">Terms & Conditions</Link>
                    </div>
                    <p className="text-[10px] text-muted-foreground/30">© 2026 Nebula Dark LLC</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo - Mobile Only */}
            <Link to={user ? "/dashboard" : "/"} className="md:hidden">
              <h1 className="text-2xl font-display font-bold gradient-text">ARENA</h1>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search tournaments, players..."
                  className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 font-light"
                />
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2 md:gap-4">
              {user && (
                <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-400 font-mono">
                    {formatArenaCurrency(arenaCurrency)}
                  </span>
                </div>
              )}
              {user && <NotificationDropdown />}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
                      <div className="text-right hidden md:block">
                        <p className="text-sm font-light">{profile?.gamertag || 'User'}</p>
                        <p className="text-xs text-muted-foreground font-light">
                          ${profile?.total_earnings?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-primary/50">
                        <AvatarImage src={profile?.avatar_url || ''} alt={profile?.gamertag || 'User'} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {profile?.gamertag?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wallet" className="flex items-center gap-2 cursor-pointer">
                        <Wallet className="h-4 w-4" />
                        Wallet
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="text-red-400 focus:text-red-400 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/sign-in">
                  <Button variant="default">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 md:p-8">
          {location.pathname !== '/' && <Breadcrumbs />}
          {children}
        </div>

        {/* Site Footer */}
        <footer className="border-t border-white/10 px-4 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground bg-black/20">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-medium tracking-wide text-white/70">© {new Date().getFullYear()} ARENA • Nebula Dark LLC</span>
            <span className="font-light opacity-50">Providing competitive gaming solutions globally. Registered in Delaware, USA.</span>
          </div>
          <div className="flex items-center gap-8">
            <Link to="/privacy" className="hover:text-white transition-colors underline underline-offset-4">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors underline underline-offset-4">Terms & Conditions</Link>
          </div>
        </footer>
      </main>

      {/* Feedback Modal */}
      <FeedbackModal open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen} />
    </div>
  );
}
