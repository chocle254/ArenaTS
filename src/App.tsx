import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
            {routes.map((route, index) => (
              <Route
                key={index}
                path={route.path}
                element={route.element}
              />
            ))}
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
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
