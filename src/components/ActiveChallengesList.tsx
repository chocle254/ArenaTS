
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useChallenges } from '@/contexts/ChallengeContext';
import { QuickMatchLiveCard } from './QuickMatchLiveCard';

export function ActiveChallengesList() {
  const { activeChallenges } = useChallenges();
  const { user } = useAuth();

  if (!user || activeChallenges.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Your active challenges
        </h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {activeChallenges.map((challenge) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              <QuickMatchLiveCard 
                challenge={challenge} 
                currentUserId={user.id} 
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
