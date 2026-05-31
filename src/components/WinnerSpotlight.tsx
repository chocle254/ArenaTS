import { Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';

interface WinnerSpotlightProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winner: {
    user_id: string;
    gamertag: string | null;
    avatar_url: string | null;
  };
  tournamentId: string;
  tournamentName: string;
  prizeAmount: number;
  game?: string;
  totalPlayers?: number;
  duration?: string;
}

export function WinnerSpotlight({ 
  open, 
  onOpenChange, 
  winner, 
  tournamentId, 
  tournamentName,
  prizeAmount,
  game = 'Valorant',
  totalPlayers = 16,
  duration = '2h 34m'
}: WinnerSpotlightProps) {
  const [confettiShown, setConfettiShown] = useState(false);

  useEffect(() => {
    if (open && !confettiShown) {
      setConfettiShown(true);
    }
    
    if (!open && confettiShown) {
      setConfettiShown(false);
    }
  }, [open, confettiShown]);

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/tournaments/${tournamentId}`;
    const shareText = `🏆 ${winner.gamertag || 'Champion'} won ${tournamentName} and earned $${prizeAmount.toFixed(2)}!`;
    
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    toast.success('Link copied — share your win!');
  };

  if (!open) return null;

  return (
    <>
      {/* Full dark overlay */}
      <div 
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={() => onOpenChange(false)}
      >
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Modal card */}
        <div 
          className="relative w-full max-w-md overflow-hidden rounded-2xl"
          style={{ background: '#0D0A1A' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient orbs */}
          <div 
            className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
              filter: 'blur(60px)'
            }}
          />
          <div 
            className="absolute bottom-0 right-0 w-48 h-48 rounded-full opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(34, 211, 238, 0.4) 0%, transparent 70%)',
              filter: 'blur(60px)'
            }}
          />

          {/* Animated confetti */}
          {confettiShown && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="confetti-dot"
                  style={{
                    position: 'absolute',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: ['#F5C842', '#8B5CF6', '#22D3EE'][i % 3],
                    left: `${Math.random() * 100}%`,
                    top: '-10px',
                    animation: `confetti-fall ${3 + Math.random() * 2}s linear infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                    opacity: 0.8
                  }}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white' }}>
                ARENA
              </div>
              <div className="floating-trophy text-4xl">
                🏆
              </div>
            </div>

            {/* Tournament Winner Label */}
            <div 
              className="mb-3"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: '#22D3EE',
                textTransform: 'uppercase'
              }}
            >
              TOURNAMENT WINNER
            </div>

            {/* Winner Username */}
            <h1 
              className="mb-2 winner-glow"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '32px',
                fontWeight: 700,
                color: 'white',
                textShadow: '0 0 20px rgba(139, 92, 246, 0.6)'
              }}
            >
              {winner.gamertag || 'Champion'}
            </h1>

            {/* Tournament name and round */}
            <p className="text-sm text-white/50 mb-6">
              {tournamentName} • Finals
            </p>

            {/* Prize and Stats Container */}
            <div className="flex gap-4 mb-6">
              {/* Prize Box */}
              <div 
                className="flex-1 p-4 rounded-xl"
                style={{
                  background: 'rgba(245, 200, 66, 0.08)',
                  border: '1px solid rgba(245, 200, 66, 0.25)'
                }}
              >
                <div 
                  className="text-[10px] font-semibold tracking-wider mb-2"
                  style={{ color: '#F5C842', textTransform: 'uppercase' }}
                >
                  PRIZE WON
                </div>
                <div 
                  className="prize-glow"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#F5C842'
                  }}
                >
                  ${prizeAmount.toFixed(2)}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-col gap-3 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span className="text-xs text-white/50">Game</span>
                  <span className="text-xs text-white ml-auto">{game}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-xs text-white/50">Players</span>
                  <span className="text-xs text-white ml-auto">{totalPlayers}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-xs text-white/50">Duration</span>
                  <span className="text-xs text-white ml-auto">{duration}</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 mb-6" />

            {/* Footer */}
            <div className="flex items-center justify-between">
              <Button
                onClick={handleShare}
                className="share-button relative overflow-hidden px-6 py-2 rounded-lg font-medium text-white border-0"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #22D3EE 100%)'
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                SHARE WIN
              </Button>
              <span className="text-xs text-white/30">arena.gg</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes float-trophy {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes prize-pulse {
          0%, 100% {
            text-shadow: 0 0 10px rgba(245, 200, 66, 0.5);
          }
          50% {
            text-shadow: 0 0 20px rgba(245, 200, 66, 0.8), 0 0 30px rgba(245, 200, 66, 0.4);
          }
        }

        @keyframes sheen {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }

        .floating-trophy {
          animation: float-trophy 2s ease-in-out infinite;
        }

        .prize-glow {
          animation: prize-pulse 2.5s ease-in-out infinite;
        }

        .winner-glow {
          animation: prize-pulse 3s ease-in-out infinite;
        }

        .share-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: sheen 3s infinite;
        }

        .share-button:hover::before {
          animation: sheen 1.5s infinite;
        }
      `}</style>
    </>
  );
}
