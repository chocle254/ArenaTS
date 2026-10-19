import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChallengeProvider } from '@/contexts/ChallengeContext';
import { DirectMessageProvider } from '@/contexts/DirectMessageContext';
import { WorldChatProvider } from '@/contexts/WorldChatContext';

export function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <HelmetProvider>
      {/* Router wraps every provider so anything they render (e.g. the incoming
          challenge modal) can link and navigate. */}
      <Router>
        <TooltipProvider>
          <AuthProvider>
            <WorldChatProvider>
              <DirectMessageProvider>
                <ChallengeProvider>{children}</ChallengeProvider>
              </DirectMessageProvider>
            </WorldChatProvider>
          </AuthProvider>
        </TooltipProvider>
      </Router>
    </HelmetProvider>
  );
}
