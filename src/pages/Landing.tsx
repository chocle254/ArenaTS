import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Camera, Check, Coins, Crown, Gavel, Landmark, Scale, ShieldCheck, Trophy, Wallet } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';

const GAMES = (Object.keys(GAME_INFO) as GameType[]).filter((g) => GAME_INFO[g]);

/* ------------------------------------------------------------------ */
/* Hero backdrop: a stadium at night under floodlights                 */
/* ------------------------------------------------------------------ */

function StadiumBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#101627_0%,#07090E_55%,#06070B_100%)]" />

      {/* Floodlight rigs and their beams */}
      {[
        { side: 'left-[-6%]', rot: 'rotate-[28deg]', origin: 'origin-top-left' },
        { side: 'right-[-6%]', rot: '-rotate-[28deg]', origin: 'origin-top-right' },
      ].map((b) => (
        <div key={b.side} className={cn('absolute top-[-8%]', b.side)}>
          <div className={cn('h-[120vh] w-[46vw] max-w-[720px] bg-gradient-to-b from-[#cfe0ff]/[0.16] via-primary/[0.07] to-transparent blur-2xl', b.rot, b.origin)} style={{ clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)' }} />
        </div>
      ))}
      <div className="absolute left-[4%] top-[-40px] h-24 w-48 rounded-full bg-white/50 blur-3xl" />
      <div className="absolute right-[4%] top-[-40px] h-24 w-48 rounded-full bg-white/50 blur-3xl" />

      {/* The pitch: centre circle and halfway line in perspective */}
      <div className="absolute inset-x-0 bottom-0 h-[55%] [perspective:900px]">
        <div className="absolute inset-x-[-20%] bottom-[-30%] top-0 bg-[radial-gradient(60%_60%_at_50%_70%,hsl(224_100%_55%/0.18),transparent_70%)]" />
        <svg viewBox="0 0 1200 600" className="absolute bottom-[-12%] left-1/2 w-[160%] max-w-none -translate-x-1/2 [transform:rotateX(62deg)]" fill="none">
          <g stroke="white" strokeOpacity="0.06" strokeWidth="3">
            <rect x="20" y="20" width="1160" height="560" rx="6" />
            <line x1="600" y1="20" x2="600" y2="580" />
            <circle cx="600" cy="300" r="110" />
            <circle cx="600" cy="300" r="5" fill="white" fillOpacity="0.2" />
            <rect x="20" y="170" width="150" height="260" />
            <rect x="1030" y="170" width="150" height="260" />
          </g>
        </svg>
      </div>

      {/* Film grain so gradients don't band */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero device: the real tournament card, on a phone                   */
/* ------------------------------------------------------------------ */

function useTicker(startSeconds: number) {
  const [s, setS] = useState(startSeconds);
  useEffect(() => {
    const t = setInterval(() => setS((v) => (v <= 0 ? startSeconds : v - 1)), 1000);
    return () => clearInterval(t);
  }, [startSeconds]);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function HeroDevice() {
  const time = useTicker(2 * 3600 + 14 * 60 + 37);
  const codm = GAME_INFO.codm;
  return (
    <div className="relative mx-auto w-[300px] sm:w-[320px]">
      {/* Phone */}
      <div className="relative rounded-[2.6rem] border border-white/10 bg-[#0B0E14] p-2.5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)_inset]">
        <div className="overflow-hidden rounded-[2.1rem] bg-background">
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <img src="/images/crest-128.webp" alt="" className="h-7 w-7" width={28} height={28} />
            <span className="flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-score text-sm text-gold">
              <Coins className="h-3.5 w-3.5" /> 1,250
            </span>
          </div>

          <div className="relative mx-3 overflow-hidden rounded-2xl border border-border">
            <img src={codm.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/30" />
            <div className="relative p-4">
              <p className="text-[11px] font-semibold text-primary-soft">Your next match</p>
              <p className="mt-1 font-score text-[22px] font-bold leading-[1.05]">Kericho Clash: CODM 1v1 Cup</p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">Starts in</p>
                  <p className="font-score text-[28px] font-bold leading-none tabular-nums">{time}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Prize pool</p>
                  <p className="font-score text-[28px] font-bold leading-none text-gold">
                    <span className="text-sm">KES</span> 8,000
                  </p>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[69%] rounded-full bg-primary" />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                <span>11 of 16 players</span>
                <span>Check-in opens 15 min before</span>
              </div>
              <div className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white">
                <Check className="h-4 w-4" /> You’re registered
              </div>
            </div>
          </div>

          <p className="px-4 pb-1.5 pt-4 text-[11px] font-semibold text-muted-foreground">Live now</p>
          {[
            { g: 'efootball' as GameType, n: 'Weekend League', p: 'KES 6,000' },
            { g: 'pubg_mobile' as GameType, n: 'Savannah Royale', p: 'KES 4,500' },
          ].map((row) => (
            <div key={row.n} className="mx-3 mb-2 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
              <img src={GAME_INFO[row.g]?.icon} alt="" className="h-8 w-8 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{row.n}</p>
                <p className="flex items-center gap-1 text-[10px] text-live">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" /> Live
                </p>
              </div>
              <span className="font-score text-sm text-gold">{row.p}</span>
            </div>
          ))}
          <div className="h-4" />
        </div>
      </div>

      {/* Floating result card */}
      <div className="absolute -left-3 top-[60%] w-[190px] rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur sm:-left-20 sm:w-[210px]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15">
            <Trophy className="h-4 w-4 text-gold" />
          </span>
          <div>
            <p className="text-xs font-semibold">Match won</p>
            <p className="font-score text-lg font-bold leading-none text-gold">+ KES 450</p>
          </div>
        </div>
      </div>

      {/* Floating referee card */}
      <div className="absolute -right-6 bottom-[6%] hidden w-[200px] rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur sm:block lg:-right-20">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Gavel className="h-4 w-4 text-primary-soft" /> Referee assigned
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Result disputed. Reviewing both screenshots now.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const rise = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Nav */}
      <header
        className={cn('fixed inset-x-0 top-0 z-50 transition-colors duration-300', scrolled ? 'border-b border-border bg-background/85 backdrop-blur-xl' : 'bg-transparent')}
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:h-20">
          <Link to="/" aria-label="Arena home" className="shrink-0">
            <img src="/images/logo-sm.webp" alt="Arena" className="h-10 w-auto lg:h-12" height={48} />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#brackets" className="hover:text-foreground">Brackets</a>
            <a href="#fair-play" className="hover:text-foreground">Fair play</a>
            <a href="#money" className="hover:text-foreground">Payouts</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/sign-in" className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground/90 hover:text-foreground">
              Sign in
            </Link>
            <Link to="/sign-up" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
              Join Arena
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative isolate">
        <StadiumBackdrop />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-28 sm:px-6 lg:min-h-[100svh] lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-24 lg:pt-32">
          <div className="text-center lg:text-left">
            <motion.p {...rise(0)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-foreground/80 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
              </span>
              Brackets running every day
            </motion.p>
            <h1 className="mt-6 font-display text-[clamp(3.1rem,11vw,7.25rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.01em]">
              <motion.span {...rise(0.08)} className="block">
                Where gamers
              </motion.span>
              <motion.span {...rise(0.16)} className="block">
                prove their
              </motion.span>
              <motion.span {...rise(0.24)} className="block">
                worth.
              </motion.span>
            </h1>
            <motion.p {...rise(0.34)} className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg lg:mx-0">
              Join refereed tournaments, settle 1v1 money matches, and withdraw what you win. One app for CODM, eFootball, PUBG Mobile, FIFA and more.
            </motion.p>
            <motion.div {...rise(0.42)} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link to="/sign-up" className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-white transition-colors hover:bg-primary/90 sm:w-auto">
                Create free account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/tournaments" className="flex h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-6 text-base font-semibold backdrop-blur hover:bg-white/[0.07] sm:w-auto">
                See open tournaments
              </Link>
            </motion.div>
            <motion.ul {...rise(0.5)} className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-foreground/70 lg:justify-start">
              <li className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-primary-soft" /> Referees on every bracket
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary-soft" /> Stakes held until the result
              </li>
              <li className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary-soft" /> Paid out to M-Pesa
              </li>
            </motion.ul>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 60, rotate: 2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative pb-6"
          >
            <HeroDevice />
          </motion.div>
        </div>
      </section>

      {/* Game strip */}
      <section aria-label="Supported games" className="relative -mt-6 overflow-hidden py-6">
        <div className="-mx-[5%] w-[110%] -rotate-2 border-y border-white/10 bg-card/80 py-4 backdrop-blur">
          {/* Each tile carries its own right padding so the loop point is exactly half the strip */}
          <div className="flex w-max animate-[marquee_45s_linear_infinite] motion-reduce:animate-none">
            {[...GAMES, ...GAMES].map((g, i) => (
              <div key={`${g}-${i}`} className="shrink-0 pr-4" aria-hidden={i >= GAMES.length}>
                <div className="relative h-24 w-44 overflow-hidden rounded-xl sm:h-28 sm:w-52">
                  <img src={GAME_INFO[g].banner} alt={i < GAMES.length ? GAME_INFO[g].name : ''} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <span className="absolute bottom-2 left-3 font-score text-lg font-bold">{GAME_INFO[g].shortName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-6 lg:py-32">
        <div className="max-w-2xl">
          <h2 className="font-display text-5xl font-bold leading-[0.95] sm:text-6xl">From sign-up to payout in three moves.</h2>
          <p className="mt-4 text-lg text-muted-foreground">No group-chat brackets, no chasing people for money. Arena runs the bracket, the result and the payout.</p>
        </div>
        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          <Step n={1} title="Pick a bracket" text="Filter by game, see the prize and entry fee up front, and lock your spot before check-in opens.">
            <div className="space-y-2">
              {[
                ['CODM 1v1 Cup', 'KES 100', 'KES 8,000'],
                ['eFootball League', 'KES 50', 'KES 6,000'],
              ].map(([n, fee, prize]) => (
                <div key={n} className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 text-xs">
                  <span className="font-semibold">{n}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground">Entry {fee}</span>
                    <span className="font-score text-sm text-gold">{prize}</span>
                  </span>
                </div>
              ))}
            </div>
          </Step>
          <Step n={2} title="Play and report" text="Both players report the winner with a screenshot. If the reports clash, a referee steps in.">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-success/15 font-semibold text-success">
                <Crown className="h-4 w-4" /> I won
              </div>
              <div className="flex h-11 items-center justify-center rounded-lg bg-secondary font-semibold text-muted-foreground">I lost</div>
              <div className="col-span-2 flex h-11 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground">
                <Camera className="h-4 w-4" /> Add screenshot proof
              </div>
            </div>
          </Step>
          <Step n={3} title="Get paid" text="Winnings land in your cash balance automatically. Withdraw them or turn them back into entries.">
            <div className="rounded-lg border border-gold/25 bg-gold/[0.07] p-3">
              <p className="text-xs text-muted-foreground">Cash balance</p>
              <p className="font-score text-3xl font-bold leading-none text-gold">$84.50</p>
              <p className="mt-2 flex items-center gap-1 text-xs text-success">
                <Check className="h-3.5 w-3.5" /> 1st place payout received
              </p>
            </div>
          </Step>
        </ol>
      </section>

      {/* Brackets */}
      <section id="brackets" className="scroll-mt-24 border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-32">
          <div>
            <h2 className="font-display text-5xl font-bold leading-[0.95] sm:text-6xl">Live brackets. Zero confusion.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Brackets build themselves from the sign-ups, update the second a result is confirmed, and keep every route to the final on record.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {['Solo and 5v5 team formats', 'Check-in before each round', 'A champion page for every winner'].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <BadgeCheck className="h-5 w-5 shrink-0 text-primary-soft" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <ExampleBracket />
        </div>
      </section>

      {/* Fair play */}
      <section id="fair-play" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-6 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="font-display text-5xl font-bold leading-[0.95] sm:text-6xl">Real referees. Real outcomes.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              When two players report different winners, the match goes to a referee who sees the bracket, the screenshots and both players in one chat, and can correct the result.
            </p>
            <div className="mt-10 flex items-end gap-4">
              <p className="font-display text-8xl font-extrabold leading-[0.8]">~2</p>
              <p className="pb-1 text-sm text-muted-foreground">
                minutes average
                <br />
                dispute resolution
              </p>
            </div>
          </div>
          <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[1.35rem] before:top-6 before:w-px before:bg-border">
            {[
              { icon: Scale, t: 'Dispute logged', d: 'Conflicting reports are flagged the moment the second one arrives.' },
              { icon: Gavel, t: 'Referee assigned', d: 'An available referee picks it up and is notified instantly.' },
              { icon: Camera, t: 'Evidence reviewed', d: 'Screenshots and a three-way chat with both players.' },
              { icon: Trophy, t: 'Result confirmed', d: 'The bracket updates and the prize is released to the winner.' },
            ].map((s) => (
              <li key={s.t} className="relative flex gap-4 rounded-2xl border border-border bg-card p-4">
                <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                  <s.icon className="h-5 w-5 text-primary-soft" />
                </span>
                <span>
                  <span className="block font-semibold">{s.t}</span>
                  <span className="block text-sm text-muted-foreground">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Money */}
      <section id="money" className="scroll-mt-24 border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
          <div className="max-w-2xl">
            <h2 className="font-display text-5xl font-bold leading-[0.95] sm:text-6xl">Your money, clearly split.</h2>
            <p className="mt-4 text-lg text-muted-foreground">Two balances, so you always know what you can enter with and what you can take home.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <Coins className="h-7 w-7 text-gold" />
              <h3 className="mt-5 text-3xl">Play balance</h3>
              <p className="mt-2 text-muted-foreground">Top up with M-Pesa to cover entry fees and challenge stakes.</p>
              <p className="mt-6 font-score text-5xl font-bold text-gold">KES 1,250</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <Wallet className="h-7 w-7 text-success" />
              <h3 className="mt-5 text-3xl">Winnings</h3>
              <p className="mt-2 text-muted-foreground">Prizes land here. Withdraw straight to your M-Pesa.</p>
              <p className="mt-6 font-score text-5xl font-bold">KES 8,450</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final call */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_120%,hsl(224_100%_55%/0.35),transparent_70%)]" aria-hidden />
        <div className="mx-auto max-w-4xl px-4 py-28 text-center sm:px-6 lg:py-36">
          <h2 className="font-display text-[clamp(3rem,10vw,6.5rem)] font-extrabold uppercase leading-[0.88]">Your bracket is waiting.</h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground">Make an account in under a minute and join your first tournament today.</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/sign-up" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-white hover:bg-primary/90 sm:w-auto">
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/sign-in" className="flex h-12 w-full items-center justify-center rounded-xl border border-white/15 px-7 text-base font-semibold hover:bg-white/[0.05] sm:w-auto">
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border" style={{ paddingBottom: 'var(--safe-bottom)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 sm:px-6 md:flex-row md:justify-between">
          <img src="/images/logo-sm.webp" alt="Arena" className="h-10 w-auto" />
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground" aria-label="Footer">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#fair-play" className="hover:text-foreground">Fair play</a>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </nav>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Nebula Dark LLC</p>
        </div>
      </footer>
    </div>
  );
}

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: ReactNode }) {
  return (
    <li className="flex flex-col rounded-3xl border border-border bg-card p-6">
      <span className="font-display text-5xl font-extrabold leading-none text-primary-soft/40">0{n}</span>
      <h3 className="mt-4 text-3xl">{title}</h3>
      <p className="mt-2 flex-1 text-muted-foreground">{text}</p>
      <div className="mt-6">{children}</div>
    </li>
  );
}

function ExampleBracket() {
  const match = (a: [string, string | number], b: [string, string | number], state: 'done' | 'live' | 'next' = 'done') => {
    const aWins = state === 'done' && Number(a[1]) > Number(b[1]);
    const bWins = state === 'done' && Number(b[1]) > Number(a[1]);
    return (
      <div className={cn('w-full overflow-hidden rounded-xl border bg-background/70 text-sm', state === 'live' ? 'border-live/50' : 'border-border')}>
        {[
          [a, aWins],
          [b, bWins],
        ].map(([p, win], i) => (
          <div key={i} className={cn('flex items-center justify-between px-3 py-2', i === 0 && 'border-b border-border', !win && state === 'done' && 'text-muted-foreground')}>
            <span className={cn('truncate', win && 'font-semibold text-foreground')}>{(p as [string, string | number])[0]}</span>
            <span className={cn('font-score text-base', win && 'text-gold')}>{(p as [string, string | number])[1]}</span>
          </div>
        ))}
      </div>
    );
  };
  return (
    <figure className="overflow-x-auto rounded-3xl border border-border bg-card p-5 scrollbar-hide sm:p-6">
      <figcaption className="mb-5 flex items-center justify-between gap-3">
        <span>
          <span className="block font-score text-xl font-bold">Friday Valorant Open</span>
          <span className="block text-xs text-muted-foreground">Example bracket</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-live/15 px-2.5 py-1 text-xs font-semibold text-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" /> Semi-final live
        </span>
      </figcaption>
      <div className="grid min-w-[560px] grid-cols-[1fr_1fr_0.9fr] items-center gap-4">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Quarter-finals</p>
          {match(['XenoFX', 2], ['ShadowK', 1])}
          {match(['NightCrawler', 2], ['BladeRN', 0])}
          {match(['PixelGod', 1], ['AceVlr', 2])}
          {match(['GhostMV', 2], ['ZeroFPS', 1])}
        </div>
        <div className="space-y-16">
          <p className="-mb-12 text-xs text-muted-foreground">Semi-finals</p>
          {match(['XenoFX', 2], ['NightCrawler', 1])}
          {match(['AceVlr', '–'], ['GhostMV', '–'], 'live')}
        </div>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Final</p>
          {match(['XenoFX', '–'], ['TBD', '–'], 'next')}
          <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.07] px-3 py-3">
            <Crown className="h-5 w-5 text-gold" />
            <span className="text-sm">
              <span className="block font-semibold">Champion</span>
              <span className="block text-xs text-muted-foreground">Decided tonight</span>
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
