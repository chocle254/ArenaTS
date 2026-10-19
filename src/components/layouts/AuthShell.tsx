import type React from 'react';
import { Link } from 'react-router-dom';

const ART = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4246118f-7c56-4af3-bc4d-6569d919b747.jpg';

/**
 * Full-screen layout for sign in / sign up. One background image (not a
 * slideshow of eight), form-first on phones.
 */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Art panel (desktop) */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src={ART} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-background/40 to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link to="/" aria-label="Arena Royal home">
            <img src="/images/logo-sm.webp" alt="Arena Royal" className="h-14 w-auto" />
          </Link>
          <div className="max-w-md space-y-4">
            <p className="font-display text-5xl font-bold leading-[0.95]">Your skill. Your bracket. Your payout.</p>
            <p className="text-muted-foreground">
              Tournaments and 1v1 challenges for CODM, eFootball, PUBG Mobile and more — with referees, real prizes and a leaderboard that remembers.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center px-5 py-10 sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 lg:hidden"
          style={{ background: 'radial-gradient(600px 400px at 50% 0%, hsl(262 83% 45% / 0.25), transparent 70%)' }}
        />
        <div className="relative w-full max-w-md">
          <Link to="/" className="mb-8 flex justify-center lg:hidden" aria-label="Arena Royal home">
            <img src="/images/logo-sm.webp" alt="Arena Royal" className="h-16 w-auto" />
          </Link>
          <div className="mb-8 space-y-2">
            <h1 className="text-4xl">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          {children}
          {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg className="h-4 w-4" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
      <path
        fill="currentColor"
        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
      />
    </svg>
  );
}
