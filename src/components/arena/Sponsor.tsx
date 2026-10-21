import { BadgeCheck, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SponsorFields {
  official?: boolean | null;
  sponsor_name?: string | null;
  sponsor_logo_url?: string | null;
  sponsor_url?: string | null;
  sponsor_message?: string | null;
}

function Logo({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md bg-gold/15 font-score font-bold text-gold',
          className,
        )}
        aria-hidden
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=''
      loading='lazy'
      onError={() => setBroken(true)}
      className={cn('shrink-0 rounded-md bg-white object-contain', className)}
    />
  );
}

/** One-line 'Sponsored by …' for cards. Renders nothing for regular tournaments. */
export function SponsorBadge({
  tournament,
  className,
}: {
  tournament: SponsorFields;
  className?: string;
}) {
  if (!tournament.official) return null;
  if (!tournament.sponsor_name) {
    return (
      <p
        className={cn(
          'flex items-center gap-1 text-xs font-semibold text-primary-soft',
          className,
        )}
      >
        <BadgeCheck className='h-3.5 w-3.5' /> Hosted by Arena
      </p>
    );
  }
  return (
    <p
      className={cn(
        'flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <Logo
        src={tournament.sponsor_logo_url}
        name={tournament.sponsor_name}
        className='h-5 w-5 text-[10px]'
      />
      <span className='truncate'>
        Sponsored by{' '}
        <span className='font-semibold text-foreground'>
          {tournament.sponsor_name}
        </span>
      </span>
    </p>
  );
}

/** Sponsor panel for the tournament page. */
export function SponsorPanel({ tournament }: { tournament: SponsorFields }) {
  if (!tournament.official || !tournament.sponsor_name) return null;
  return (
    <section className='flex flex-col gap-4 rounded-2xl border border-gold/30 bg-gold/[0.06] p-4 sm:flex-row sm:items-center'>
      <div className='flex min-w-0 flex-1 items-center gap-4'>
        <Logo
          src={tournament.sponsor_logo_url}
          name={tournament.sponsor_name}
          className='h-14 w-14 text-xl'
        />
        <div className='min-w-0 flex-1'>
          <p className='text-xs text-muted-foreground'>Prize sponsored by</p>
          <p className='font-score text-2xl font-bold leading-tight'>
            {tournament.sponsor_name}
          </p>
          {tournament.sponsor_message && (
            <p className='mt-1 text-sm text-muted-foreground'>
              {tournament.sponsor_message}
            </p>
          )}
        </div>
      </div>
      {tournament.sponsor_url && (
        <a
          href={tournament.sponsor_url}
          target='_blank'
          rel='noopener noreferrer sponsored'
          className='inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary'
        >
          Visit {tournament.sponsor_name} <ExternalLink className='h-4 w-4' />
        </a>
      )}
    </section>
  );
}
