import { lazy } from 'react';
import type { ReactNode } from 'react';

// Lazy-loaded pages: each page's code is only downloaded when the user
// actually navigates to that route, instead of all being bundled into
// one large chunk loaded on first visit.
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AdminKYC = lazy(() => import('@/pages/AdminKYC'));
const AdminReferees = lazy(() => import('@/pages/AdminReferees'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DirectMessages = lazy(() => import('@/pages/DirectMessages'));
const ExchangeRates = lazy(() => import('@/pages/ExchangeRates'));
const Friends = lazy(() => import('@/pages/Friends'));
const GamePage = lazy(() => import('@/pages/GamePage'));
const Landing = lazy(() => import('@/pages/Landing'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const LiveStream = lazy(() => import('@/pages/LiveStream'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('@/pages/TermsAndConditions'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const PaymentSuccess = lazy(() => import('@/pages/PaymentSuccess'));
const Profile = lazy(() => import('@/pages/Profile'));
const QuickMatch = lazy(() => import('@/pages/QuickMatch'));
const RefereeDashboard = lazy(() => import('@/pages/RefereeDashboard'));
const Settings = lazy(() => import('@/pages/Settings'));
const SignIn = lazy(() => import('@/pages/SignIn'));
const SignUp = lazy(() => import('@/pages/SignUp'));
const StreamingLounge = lazy(() => import('@/pages/StreamingLounge'));
const TournamentDetail = lazy(() => import('@/pages/TournamentDetail'));
const Tournaments = lazy(() => import('@/pages/Tournaments'));
const Wallet = lazy(() => import('@/pages/Wallet'));
const WorldChat = lazy(() => import('@/pages/WorldChat'));

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
    name: 'Admin KYC',
    path: '/admin/kyc',
    element: <AdminKYC />,
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
