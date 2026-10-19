import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AchievementWatcher } from '@/components/arena/AchievementWatcher';
import IntersectObserver from '@/components/common/IntersectObserver';
import { RouteGuard } from '@/components/common/RouteGuard';
import MainLayout from '@/components/layouts/MainLayout';
import { Toaster } from '@/components/ui/sonner';
import { usePresence } from '@/hooks/use-presence';
import { useTournamentReminders } from '@/hooks/use-tournament-reminders';
import { routes } from './routes';

// Shown briefly while a lazy-loaded page's code is being fetched.
function RouteFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted/60" />
        ))}
      </div>
    </div>
  );
}

function AppContent() {
  useTournamentReminders();
  usePresence();

  return (
    <>
      <IntersectObserver />
      <MainLayout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
      <AchievementWatcher />
      <Toaster />
    </>
  );
}

const App: React.FC = () => {
  return (
    <RouteGuard>
      <AppContent />
    </RouteGuard>
  );
};

export default App;
