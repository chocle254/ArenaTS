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
      <TooltipProvider>
        <AuthProvider>
          <WorldChatProvider>
            <DirectMessageProvider>
              <ChallengeProvider>
                <Router>
                  {children}
                </Router>
              </ChallengeProvider>
            </DirectMessageProvider>
          </WorldChatProvider>
        </AuthProvider>
      </TooltipProvider>
    </HelmetProvider>
  );
}
