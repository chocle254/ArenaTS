import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes';

interface RouteGuardProps {
  children: React.ReactNode;
}

// System-level public routes (no need to register in routes.tsx)
const SYSTEM_PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/admin-setup', '/403', '/404'];

// Derived from routes.tsx: all routes marked with public: true
const routePublicPaths = routes.filter(r => r.public).map(r => r.path);

const PUBLIC_ROUTES = [...SYSTEM_PUBLIC_ROUTES, ...routePublicPaths];

function matchPublicRoute(path: string, patterns: string[]) {
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(path);
    }
    return path === pattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);

    if (!user && !isPublic) {
      // Send signed-out visitors to sign in, then back to where they were going
      // (e.g. a tournament link shared on WhatsApp).
      const next = `${location.pathname}${location.search}`;
      navigate(next === '/dashboard' ? '/sign-in' : `/sign-in?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [user, loading, location.pathname, location.search, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <img src="/images/crest-128.webp" alt="" className="h-16 w-16 animate-pulse" width={64} height={64} />
        <span className="sr-only">Loading Arena</span>
      </div>
    );
  }

  return <>{children}</>;
}