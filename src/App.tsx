import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { RouteGuard } from '@/components/common/RouteGuard';
import MainLayout from '@/components/layouts/MainLayout';
import { Toaster } from '@/components/ui/sonner';
import { usePresence } from '@/hooks/use-presence';
import { useTournamentReminders } from '@/hooks/use-tournament-reminders';
import { routes } from './routes';

function AppContent() {
  useTournamentReminders();
  usePresence();
  
  return (
    <>
      <IntersectObserver />
      <MainLayout>
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
