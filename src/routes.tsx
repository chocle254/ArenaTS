import type { ReactNode } from 'react';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminReferees from '@/pages/AdminReferees';
import AdminSetup from '@/pages/AdminSetup';
import Dashboard from '@/pages/Dashboard';
import DirectMessages from '@/pages/DirectMessages';
import ExchangeRates from '@/pages/ExchangeRates';
import Friends from '@/pages/Friends';
import GamePage from '@/pages/GamePage';
import Landing from '@/pages/Landing';
import Leaderboard from '@/pages/Leaderboard';
import LiveStream from '@/pages/LiveStream';
import NotFound from '@/pages/NotFound';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsAndConditions from '@/pages/TermsAndConditions';
import NotificationsPage from '@/pages/NotificationsPage';
import PaymentSuccess from '@/pages/PaymentSuccess';
import Profile from '@/pages/Profile';
import QuickMatch from '@/pages/QuickMatch';
import RefereeDashboard from '@/pages/RefereeDashboard';
import Settings from '@/pages/Settings';
import SignIn from '@/pages/SignIn';
import SignUp from '@/pages/SignUp';
import StreamingLounge from '@/pages/StreamingLounge';
import TournamentDetail from '@/pages/TournamentDetail';
import Tournaments from '@/pages/Tournaments';
import Wallet from '@/pages/Wallet';
import WorldChat from '@/pages/WorldChat';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Landing',
    path: '/',
    element: <Landing />,
    public: true,
  },
  {
    name: 'Dashboard',
    path: '/dashboard',
    element: <Dashboard />,
    public: false,
  },
  {
    name: 'Quick Match',
    path: '/quick-match',
    element: <QuickMatch />,
    public: false,
  },
  {
    name: 'Streaming Lounge',
    path: '/streams',
    element: <StreamingLounge />,
    public: false,
  },
  {
    name: 'World Chat',
    path: '/world-chat',
    element: <WorldChat />,
    public: false,
  },
  {
    name: 'Sign In',
    path: '/sign-in',
    element: <SignIn />,
    public: true,
  },
  {
    name: 'Sign Up',
    path: '/sign-up',
    element: <SignUp />,
    public: true,
  },
  {
    name: 'Admin Setup',
    path: '/admin-setup',
    element: <AdminSetup />,
    public: true,
  },
  {
    name: 'Tournaments',
    path: '/tournaments',
    element: <Tournaments />,
    public: false,
  },
  {
    name: 'Settings',
    path: '/settings',
    element: <Settings />,
    public: false,
  },
  {
    name: 'Game Page',
    path: '/game/:gameId',
    element: <GamePage />,
    public: false,
  },
  {
    name: 'Tournament Detail',
    path: '/tournaments/:id',
    element: <TournamentDetail />,
    public: false,
  },
  {
    name: 'Leaderboard',
    path: '/leaderboard',
    element: <Leaderboard />,
    public: false,
  },
  {
    name: 'Live Stream',
    path: '/live/:matchId',
    element: <LiveStream />,
    public: false,
  },
  {
    name: 'Wallet',
    path: '/wallet',
    element: <Wallet />,
    public: false,
  },
  {
    name: 'Profile',
    path: '/profile',
    element: <Profile />,
    public: false,
  },
  {
    name: 'User Profile',
    path: '/profile/:userId',
    element: <Profile />,
    public: false,
  },
  {
    name: 'Notifications',
    path: '/notifications',
    element: <NotificationsPage />,
    public: false,
  },
  {
    name: 'Direct Messages',
    path: '/messages',
    element: <DirectMessages />,
    public: false,
  },
  {
    name: 'Friends',
    path: '/friends',
    element: <Friends />,
    public: false,
  },
  {
    name: 'Admin Control Center',
    path: '/admin',
    element: <AdminDashboard />,
    public: false,
  },
  {
    name: 'Admin Referees',
    path: '/admin/referees',
    element: <AdminReferees />,
    public: false,
  },
  {
    name: 'Referee Dashboard',
    path: '/referee',
    element: <RefereeDashboard />,
    public: false,
  },
  {
    name: 'Exchange Rates',
    path: '/exchange-rates',
    element: <ExchangeRates />,
    public: false,
  },
  {
    name: 'Payment Success',
    path: '/payment-success',
    element: <PaymentSuccess />,
    public: false,
  },
  {
    name: 'Not Found',
    path: '/404',
    element: <NotFound />,
    public: true,
  },
  {
    name: 'Privacy Policy',
    path: '/privacy',
    element: <PrivacyPolicy />,
    public: true,
  },
  {
    name: 'Terms & Conditions',
    path: '/terms',
    element: <TermsAndConditions />,
    public: true,
  },
];
