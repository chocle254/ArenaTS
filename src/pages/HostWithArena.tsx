import { BadgeCheck, BarChart3, Gavel, MessageCircle, Radio, ShieldCheck, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Business WhatsApp for sponsor enquiries. */
const WHATSAPP_NUMBER = '254719304501';
const WHATSAPP_TEXT = "Hi Arena, we'd like to host a sponsored tournament. Our brand: ";
const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

const BENEFITS = [
  {
    icon: BadgeCheck,
    title: 'Your name on the prize',
    text: 'Every card and the tournament page say "Sponsored by" with your logo, message and a link to your site.',
  },
  {
    icon: Users,
    title: 'Real players in Kenya',
    text: 'Players sign up with M-Pesa numbers, one account per number. No bots padding the numbers.',
  },
  {
    icon: Radio,
    title: 'Seen on stream',
    text: 'Players stream their matches on Twitch and the Streams page puts them in front of everyone watching.',
  },
  {
    icon: BarChart3,
    title: 'Proof it worked',
    text: 'After the event you get a one-page report: sign-ups, matches played, streams and winners.',
  },
];

const STEPS = [
  { title: 'Tell us what you want', text: 'Game, date, prize and the audience you want to reach. Message us on WhatsApp.' },
  { title: 'Pay the prize and hosting fee', text: 'By M-Pesa or bank transfer. We send an invoice with your business name.' },
  { title: 'We run everything', text: 'Bracket, check-in, referees, disputes and live updates. You don’t need an Arena account.' },
  { title: 'Winners get paid, you get the report', text: 'Prizes go straight to the winners’ M-Pesa. You get the numbers for your team.' },
];

const FORMATS = [
  { name: 'Community cup', who: 'Local shops, gaming lounges, small brands', items: ['One game, 16 to 32 players', 'Online, one evening', 'Sponsor badge and link'] },
  { name: 'Brand cup', who: 'Consumer brands and product launches', items: ['Featured on the home page', 'Growing prize pool option', 'Streamed final and report'] },
  { name: 'Campus league', who: 'Brands targeting students', items: ['Teams from different campuses', 'Several weeks of matches', 'Campus ambassadors and a live final'] },
];

const FAQ = [
  { q: 'Do we need an Arena account?', a: 'No. We host the tournament for you and show your brand as the sponsor.' },
  { q: 'How do the winners get paid?', a: 'Automatically, to the M-Pesa number on their account, as soon as the results are confirmed.' },
  { q: 'What stops cheating?', a: 'Players report results with screenshots or recordings. Disagreements go to our referees and an AI review of the evidence.' },
  { q: 'What does it cost?', a: 'The prize you choose, plus a hosting fee we agree per event. Tell us your budget and we’ll suggest a format.' },
];

export default function HostWithArena() {
  return (
    <div className="mx-auto max-w-5xl space-y-16 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/[0.10] via-card to-card p-6 sm:p-10">
        <Trophy className="absolute -right-6 -top-6 h-40 w-40 text-gold/[0.07]" aria-hidden />
        <p className="text-sm font-semibold text-gold">For brands and organizers</p>
        <h1 className="mt-2 max-w-[16ch] text-5xl leading-[0.95] sm:text-6xl">Host a tournament for Kenya’s gamers</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          You fund the prize. We run the bracket, the referees and the M-Pesa payouts, and put your name on it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" /> Talk to us on WhatsApp
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/tournaments">See live tournaments</Link>
          </Button>
        </div>
      </section>

      {/* What you get */}
      <section className="space-y-6">
        <h2 className="text-3xl">What you get</h2>
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
                <b.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl leading-tight">{b.title}</h3>
                <p className="mt-1 text-muted-foreground">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <h2 className="text-3xl">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="surface p-4">
              <span className="font-score text-3xl font-bold text-gold">{i + 1}</span>
              <h3 className="mt-1 text-lg leading-tight">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Formats */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl">Formats we run</h2>
          <p className="text-muted-foreground">Every event is quoted on its own. These are starting points.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {FORMATS.map((f) => (
            <div key={f.name} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-2xl leading-tight">{f.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.who}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {f.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="grid gap-6 rounded-3xl border border-border bg-card/60 p-6 sm:grid-cols-2 sm:p-8">
        <div className="flex gap-4">
          <ShieldCheck className="h-8 w-8 shrink-0 text-success" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your prize is locked in.</span> It’s set aside when the tournament is created and only paid to the confirmed winners.
          </p>
        </div>
        <div className="flex gap-4">
          <Gavel className="h-8 w-8 shrink-0 text-primary-soft" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Fair results.</span> Evidence on every disputed match, reviewed by referees and AI, so your event isn’t remembered for an argument.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-3xl">Questions</h2>
        <div className="divide-y divide-border rounded-2xl border border-border">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                {f.q}
                <span className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-2 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-3xl">Ready when you are</h2>
        <Button asChild size="lg">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-5 w-5" /> Talk to us on WhatsApp
          </a>
        </Button>
      </section>
    </div>
  );
}
