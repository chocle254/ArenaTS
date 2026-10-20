import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, Coins, Download, Home, LogOut, Menu, MessageSquare, Search, Settings, Swords, Trophy } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FeedbackModal } from '@/components/FeedbackModal';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/contexts/DirectMessageContext';
import { useWorldChat } from '@/contexts/WorldChatContext';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { formatArenaAmount } from '@/lib/arena-currency';
import { getLevelInfo } from '@/lib/progression';
import { cn } from '@/lib/utils';
import { CommandSearch } from './CommandSearch';
import { ACCOUNT_NAV, isActivePath, type NavItem, PRIMARY_NAV, SEARCH_ONLY_NAV, SOCIAL_NAV, STAFF_NAV } from './nav-config';

/** Routes that render full-screen without the app chrome. */
const BARE_ROUTES = ['/', '/sign-in', '/sign-up', '/auth/callback'];
/** Messaging screens: full height, no page padding (conversations go full-screen on phones). */
const IMMERSIVE_ROUTES = ['/world-chat', '/messages'];
/** Public pages that signed-out visitors may see with a minimal header. */
const PUBLIC_DOC_ROUTES = ['/terms', '/privacy', '/404'];

function useBadgeCounts() {
  const { unreadCount: worldChat } = useWorldChat();
  const { unreadTotal: messages, pendingRequests } = useDirectMessages();
  return { worldChat, messages, friends: pendingRequests.length };
}

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-none text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar (md+): icon rail on tablets, full sidebar on wide screens   */
/* ------------------------------------------------------------------ */

function SideNavLink({ item, active, count }: { item: NavItem; active: boolean; count?: number }) {
  const Icon = item.icon;
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Link
          to={item.href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
            'justify-center xl:justify-start',
            active ? 'text-white' : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
          )}
        >
          {active && (
            <motion.span
              layoutId="sidenav-active"
              className="absolute inset-0 rounded-xl bg-primary/20 ring-1 ring-inset ring-primary/40"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          {active && <span className="absolute left-0 top-1/2 hidden h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary xl:block" />}
          <Icon className="relative h-5 w-5 shrink-0" />
          <span className="relative hidden xl:inline">{item.name}</span>
          {!!count && (
            <>
              <CountBadge count={count} className="relative ml-auto hidden xl:inline-flex" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive xl:hidden" />
            </>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="xl:hidden">
        {item.name}
      </TooltipContent>
    </Tooltip>
  );
}

function Sidebar() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const badges = useBadgeCounts();
  const role = profile?.role;
  const staff = STAFF_NAV.filter((i) => i.roles?.includes(role as 'admin' | 'referee'));

  const section = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <p className="hidden px-3 pb-1 text-xs font-medium text-muted-foreground/70 xl:block">{title}</p>
      {items.map((item) => (
        <SideNavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} count={item.badge ? badges[item.badge] : 0} />
      ))}
    </div>
  );

  return (
    <aside className="glassmorphism-sidebar fixed inset-y-0 left-0 z-40 hidden w-20 flex-col md:flex xl:w-64">
      <Link to="/dashboard" className="flex h-16 shrink-0 items-center justify-center gap-2 px-4 xl:justify-start" aria-label="Arena Royal home">
        <img src="/images/crest-128.webp" alt="" className="h-10 w-10 xl:hidden" width={40} height={40} />
        <img src="/images/logo-sm.webp" alt="Arena Royal" className="hidden h-12 w-auto xl:block" height={48} />
      </Link>
      <LayoutGroup id="sidenav">
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-hide" aria-label="Main">
          {section('Play', PRIMARY_NAV)}
          {section('Social', SOCIAL_NAV)}
          {section('You', ACCOUNT_NAV)}
          {staff.length > 0 && section('Staff', staff)}
        </nav>
      </LayoutGroup>
      <div className="hidden border-t border-border/60 px-5 py-4 text-[11px] text-muted-foreground xl:block">
        <div className="flex gap-3">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
        </div>
        <p className="mt-1 opacity-60">© {new Date().getFullYear()} Nebula Dark LLC</p>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile bottom tab bar                                               */
/* ------------------------------------------------------------------ */

function BottomNav({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  const badges = useBadgeCounts();
  const socialCount = badges.messages + badges.friends + badges.worldChat;

  const tab = (href: string, label: string, Icon: typeof Home, count = 0) => {
    const active = isActivePath(pathname, href) || (href === '/messages' && ['/world-chat', '/friends'].some((p) => pathname.startsWith(p)));
    return (
      <Link
        to={href}
        aria-current={active ? 'page' : undefined}
        className={cn('relative flex flex-1 flex-col items-center justify-center gap-1 pt-2 text-[11px] font-medium', active ? 'text-white' : 'text-muted-foreground')}
      >
        {active && (
          <motion.span
            layoutId="bottomnav-active"
            className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          />
        )}
        <span className="relative">
          <Icon className="h-[22px] w-[22px]" />
          {count > 0 && <CountBadge count={count} className="absolute -right-3 -top-2 h-4 min-w-4 px-1 text-[10px]" />}
        </span>
        {label}
      </Link>
    );
  };

  const playActive = isActivePath(pathname, '/quick-match');

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Main"
    >
      <LayoutGroup id="bottomnav">
        <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
          {tab('/dashboard', 'Home', Home)}
          {tab('/tournaments', 'Compete', Trophy)}
          <div className="flex flex-1 items-start justify-center">
            <Link
              to="/quick-match"
              aria-label="Quick match"
              aria-current={playActive ? 'page' : undefined}
              className={cn(
                '-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_-10px_hsl(224_100%_50%/0.9)] ring-4 ring-background transition-transform active:scale-95',
                playActive && 'ring-primary/40',
              )}
            >
              <Swords className="h-6 w-6" />
            </Link>
          </div>
          {tab('/messages', 'Chats', MessageSquare, socialCount)}
          <button
            type="button"
            onClick={onMenu}
            className="flex flex-1 flex-col items-center justify-center gap-1 pt-2 text-[11px] font-medium text-muted-foreground"
          >
            <Menu className="h-[22px] w-[22px]" />
            More
          </button>
        </div>
      </LayoutGroup>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile "More" sheet                                                 */
/* ------------------------------------------------------------------ */

function MoreSheet({ open, onOpenChange, onSignOut }: { open: boolean; onOpenChange: (o: boolean) => void; onSignOut: () => void }) {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const badges = useBadgeCounts();
  const { canInstall, install } = useInstallPrompt();
  const staff = STAFF_NAV.filter((i) => i.roles?.includes(profile?.role as 'admin' | 'referee'));
  const level = getLevelInfo(profile);
  const ac = Number(profile?.arena_currency ?? 0);

  // The bottom bar already covers Home, Tournaments, Quick Match and Messages
  const inBottomBar = new Set(['/dashboard', '/tournaments', '/quick-match', '/messages', '/profile', '/wallet']);
  const tiles = [...PRIMARY_NAV, ...SOCIAL_NAV, ...ACCOUNT_NAV].filter((i) => !inBottomBar.has(i.href));

  const tile = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActivePath(pathname, item.href);
    const count = item.badge ? badges[item.badge] : 0;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => onOpenChange(false)}
        className={cn(
          'relative flex flex-col items-start gap-3 rounded-2xl border p-3.5 text-sm font-semibold transition-colors',
          active ? 'border-primary/50 bg-primary/10' : 'border-border bg-card active:bg-secondary',
        )}
      >
        <Icon className={cn('h-5 w-5', active ? 'text-primary-soft' : 'text-muted-foreground')} />
        {item.name}
        {count > 0 && <CountBadge count={count} className="absolute right-3 top-3" />}
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-3xl border-t border-border bg-background p-0">
        <SheetTitle className="sr-only">More</SheetTitle>
        <SheetDescription className="sr-only">Your account and the rest of Arena</SheetDescription>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
        {/* Top padding leaves room for the sheet's close button */}
        <div className="grid grid-cols-2 gap-2 p-4 pb-2 pt-12">
          <Link to="/profile" onClick={() => onOpenChange(false)} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ''} alt="" />
              <AvatarFallback className="bg-secondary font-score">{profile?.gamertag?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{profile?.gamertag || 'Player'}</span>
              <span className="block text-xs text-muted-foreground">Level {level.level}</span>
            </span>
          </Link>
          <Link to="/wallet" onClick={() => onOpenChange(false)} className="flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold/[0.06] p-3">
            <Coins className="h-5 w-5 shrink-0 text-gold" />
            <span className="min-w-0">
              <span className="block font-score text-lg font-bold leading-tight text-gold">KES {formatArenaAmount(ac)}</span>
              <span className="block text-xs text-muted-foreground">Wallet</span>
            </span>
          </Link>
        </div>
        <nav className="grid grid-cols-3 gap-2 px-4 py-2" aria-label="More pages">
          {tiles.map(tile)}
          {staff.map(tile)}
        </nav>
        <div className="flex items-center gap-2 px-4 pb-2 pt-2" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
          {canInstall && (
            <button
              type="button"
              onClick={async () => {
                const ok = await install();
                if (ok) toast.success('Arena is on your home screen');
              }}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary/15 text-sm font-semibold text-primary-soft"
            >
              <Download className="h-4 w-4" />
              Install app
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSignOut();
            }}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
        <div className="flex justify-center gap-4 pb-4 text-xs text-muted-foreground" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
          <Link to="/privacy" onClick={() => onOpenChange(false)}>Privacy</Link>
          <Link to="/terms" onClick={() => onOpenChange(false)}>Terms</Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

/** Detail pages get a back arrow on phones; the value is where "back" goes with no history. */
function parentOf(pathname: string): string | null {
  if (/^\/tournaments\/[^/]+/.test(pathname)) return '/tournaments';
  if (/^\/game\/[^/]+/.test(pathname)) return '/tournaments';
  if (/^\/live\/[^/]+/.test(pathname)) return '/streams';
  if (/^\/profile\/[^/]+/.test(pathname)) return '/leaderboard';
  if (pathname === '/achievements') return '/profile';
  if (pathname === '/notifications' || pathname === '/settings') return '/dashboard';
  if (pathname.startsWith('/admin/')) return '/admin';
  return null;
}

function TopBar({ onSearch, onSignOut }: { onSearch: () => void; onSignOut: () => void }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const backTo = parentOf(pathname);
  const level = getLevelInfo(profile);
  const ac = Number(profile?.arena_currency ?? 0);
  const { canInstall, install } = useInstallPrompt();

  return (
    <header className="glassmorphism-topbar sticky top-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex h-16 items-center gap-3 px-4 md:px-6 xl:px-8">
        {backTo ? (
          <button
            type="button"
            onClick={() => {
              const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
              if (idx > 0) navigate(-1);
              else navigate(backTo);
            }}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-white/5 md:hidden"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : (
          <Link to="/dashboard" className="md:hidden" aria-label="Arena home">
            <img src="/images/crest-128.webp" alt="" className="h-9 w-9" width={36} height={36} />
          </Link>
        )}

        <button
          type="button"
          onClick={onSearch}
          className="hidden h-10 max-w-md flex-1 items-center gap-3 rounded-xl border border-border bg-white/[0.03] px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:flex"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search players and tournaments</span>
          <kbd className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onSearch}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <Link
            to="/wallet"
            className="flex h-9 items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 pl-2 pr-3 text-gold transition-colors hover:bg-gold/15"
            aria-label={`Play balance: KES ${ac}`}
          >
            <Coins className="h-4 w-4" />
            <span className="font-score text-base leading-none">{formatArenaAmount(ac)}</span>
            <span className="hidden text-[11px] font-semibold text-gold/70 sm:inline">KES</span>
          </Link>

          <NotificationDropdown />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-3 rounded-xl p-1 pr-1 transition-colors hover:bg-white/5 lg:pr-3" aria-label="Account menu">
                <span className="relative">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/40">
                    <AvatarImage src={profile?.avatar_url || ''} alt="" />
                    <AvatarFallback className="bg-primary/20 font-score">{profile?.gamertag?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1 font-score text-[10px] leading-none text-white">
                    {level.level}
                  </span>
                </span>
                <span className="hidden text-left lg:block">
                  <span className="block max-w-[140px] truncate text-sm font-semibold leading-tight">{profile?.gamertag || 'Player'}</span>
                  <span className="block text-xs text-muted-foreground">Level {level.level}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-1.5">
              <DropdownMenuItem onSelect={() => navigate('/profile')} className="gap-3 rounded-lg p-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || ''} alt="" />
                  <AvatarFallback className="bg-secondary font-score">{profile?.gamertag?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{profile?.gamertag || 'Player'}</span>
                  <span className="block text-xs text-muted-foreground">
                    Level {level.level}, {level.toNext.toLocaleString()} XP to go
                  </span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/settings')} className="rounded-lg">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              {canInstall && (
                <DropdownMenuItem onSelect={() => void install()} className="rounded-lg">
                  <Download className="mr-2 h-4 w-4" />
                  Install app
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={onSignOut} className="rounded-lg text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Minimal header for signed-out visitors on legal pages               */
/* ------------------------------------------------------------------ */

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="glassmorphism-topbar sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" aria-label="Arena Royal home">
            <img src="/images/logo-sm.webp" alt="Arena Royal" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/sign-in" className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/sign-up" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Join Arena</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  const searchPages = useMemo(() => {
    const staff = STAFF_NAV.filter((i) => i.roles?.includes(profile?.role as 'admin' | 'referee'));
    return [...PRIMARY_NAV, ...SOCIAL_NAV, ...ACCOUNT_NAV, ...SEARCH_ONLY_NAV, ...staff];
  }, [profile?.role]);

  // Ctrl/⌘ + K opens search
  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user]);

  // Players who run out of Arena Currency are asked for feedback once
  useEffect(() => {
    if (user && profile && profile.arena_currency !== undefined && profile.arena_currency <= 0 && !profile.feedback_submitted) {
      setFeedbackModalOpen(true);
    }
  }, [user, profile]);

  // New pages start at the top; back/forward keeps the browser's restored position
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [location.pathname, navigationType]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast.success('Signed out');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Could not sign out. Please try again.');
    }
  }, [signOut, navigate]);

  const path = location.pathname;
  const immersive = IMMERSIVE_ROUTES.includes(path);
  if (BARE_ROUTES.includes(path)) return <>{children}</>;
  if (!user) {
    // Signed-out visitors only reach public pages (RouteGuard redirects the rest)
    return PUBLIC_DOC_ROUTES.includes(path) ? <PublicShell>{children}</PublicShell> : <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-20 xl:pl-64">
        <TopBar onSearch={() => setSearchOpen(true)} onSignOut={handleSignOut} />
        <main
          id="main"
          className={cn(
            'mx-auto w-full',
            immersive ? 'pb-20 md:h-[calc(100dvh-4rem)] md:pb-0' : 'max-w-[1400px] px-4 pb-28 pt-5 md:px-6 md:pb-12 md:pt-6 xl:px-8',
          )}
        >
          <ErrorBoundary compact resetKey={path}>
            {/* Enter-only transition: a keyed wrapper fades each new page in.
                (An exit animation would briefly render the next route inside
                the old wrapper and mount it twice.) Messaging screens fade
                without movement: a transform would break their full-screen
                fixed layout on phones. */}
            <motion.div
              key={path}
              className={immersive ? 'md:h-full' : undefined}
              initial={reduceMotion ? false : immersive ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={immersive ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </ErrorBoundary>
        </main>
      </div>

      <BottomNav onMenu={() => setMenuOpen(true)} />
      <MoreSheet open={menuOpen} onOpenChange={setMenuOpen} onSignOut={handleSignOut} />
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} pages={searchPages} />
      <FeedbackModal open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen} />
    </div>
  );
}
