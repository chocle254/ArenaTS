import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BarChart3,
  Globe,
  Home,
  MessageSquare,
  Play,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  User,
  Users,
  Wallet,
  Gavel,
  ArrowLeftRight,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
  badge?: 'worldChat' | 'messages' | 'friends';
  roles?: Array<'admin' | 'referee'>;
}

export const PRIMARY_NAV: NavItem[] = [
  { name: 'Home', href: '/dashboard', icon: Home, keywords: ['dashboard'] },
  { name: 'Tournaments', href: '/tournaments', icon: Trophy, keywords: ['brackets', 'compete'] },
  { name: 'Quick Match', href: '/quick-match', icon: Swords, keywords: ['challenge', '1v1', 'duel'] },
  { name: 'Leaderboard', href: '/leaderboard', icon: BarChart3, keywords: ['ranking', 'top'] },
  { name: 'Streams', href: '/streams', icon: Play, keywords: ['watch', 'live', 'twitch'] },
];

export const SOCIAL_NAV: NavItem[] = [
  { name: 'World Chat', href: '/world-chat', icon: Globe, badge: 'worldChat', keywords: ['chat'] },
  { name: 'Messages', href: '/messages', icon: MessageSquare, badge: 'messages', keywords: ['dm', 'inbox'] },
  { name: 'Friends', href: '/friends', icon: Users, badge: 'friends', keywords: ['social'] },
];

export const ACCOUNT_NAV: NavItem[] = [
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Achievements', href: '/achievements', icon: Award, keywords: ['badges', 'level', 'xp'] },
  { name: 'Wallet', href: '/wallet', icon: Wallet, keywords: ['balance', 'deposit', 'withdraw', 'money'] },
  { name: 'Exchange Rates', href: '/exchange-rates', icon: ArrowLeftRight, keywords: ['currency', 'kes'] },
  { name: 'Settings', href: '/settings', icon: Settings, keywords: ['password', 'account'] },
];

export const STAFF_NAV: NavItem[] = [
  { name: 'Referee Center', href: '/referee', icon: Gavel, roles: ['referee', 'admin'], keywords: ['disputes'] },
  { name: 'Admin', href: '/admin', icon: ShieldCheck, roles: ['admin'], keywords: ['control'] },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/profile') return pathname === '/profile';
  return pathname === href || pathname.startsWith(`${href}/`);
}
