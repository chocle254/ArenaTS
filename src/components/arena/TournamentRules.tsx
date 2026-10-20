import { Gavel, Radio, ScrollText, ShieldCheck, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface RuleGroup {
  id: string;
  title: string;
  icon: ReactNode;
  rules: string[];
}

interface RuleSettings {
  check_in_window?: number | null;
  match_time_limit?: number | null;
  team_size?: number | null;
}

/** House rules that apply to every Arena tournament. */
export function defaultRuleGroups(t: RuleSettings = {}): RuleGroup[] {
  const checkIn = t.check_in_window || 30;
  const limit = t.match_time_limit || 60;
  const team = (t.team_size || 1) > 1;
  return [
    {
      id: 'setup',
      title: 'Connection and setup',
      icon: <Wifi className="h-4 w-4" />,
      rules: [
        'Play on a stable connection. Use Wi-Fi or strong 4G/5G, and close downloads and other apps that eat bandwidth.',
        'A disconnect is not an automatic rematch. Replays happen only if your opponent agrees or a referee allows it.',
        'Update the game before the tournament starts and keep your device charged or plugged in.',
        `Check in within ${checkIn} minutes of the start time or your slot goes to the next player.`,
      ],
    },
    {
      id: 'fair',
      title: 'Fair play',
      icon: <ShieldCheck className="h-4 w-4" />,
      rules: [
        'No hacks, mods, aimbots, macros, scripts or exploits of any kind.',
        team ? 'Every player must play on their own account. No swapping in unregistered players.' : 'Play on your own account. No one else plays for you.',
        'No teaming up with other players, fixing results or agreeing to throw a match.',
        'Keep chat respectful. Abuse, threats and hate speech get you removed.',
        'Cheating means disqualification, a permanent ban and loss of any winnings.',
      ],
    },
    {
      id: 'match',
      title: 'On match day',
      icon: <Radio className="h-4 w-4" />,
      rules: [
        "Start your Twitch stream before you press “I'm ready”. Unstreamed matches can be voided.",
        'Both players complete the ready check within 5 minutes once the match opens. A no-show forfeits.',
        `Finish and report each match within ${limit} minutes.`,
      ],
    },
    {
      id: 'results',
      title: 'Results and disputes',
      icon: <Gavel className="h-4 w-4" />,
      rules: [
        'Both players report the winner and upload a screenshot of the final score.',
        "If the reports don't match, a referee reviews the evidence and chat. Their decision is final.",
        'Referees and admins never decide a match they are playing in.',
      ],
    },
  ];
}

/** Turns the organizer's free text into clean rule lines. */
export function parseCustomRules(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^([-*•]|\d+[.)])\s*/, ''))
    .filter(Boolean);
}

function RuleList({ rules, accent }: { rules: string[]; accent?: boolean }) {
  return (
    <ul className="space-y-2.5">
      {rules.map((r) => (
        <li key={r} className="flex gap-3 text-[15px] leading-relaxed">
          <span aria-hidden className={cn('mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full', accent ? 'bg-gold' : 'bg-primary')} />
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}

export function TournamentRules({
  tournament,
}: {
  tournament: RuleSettings & { rules?: string | null; banned_items?: string | null; tie_break_rules?: string | null };
}) {
  const custom = parseCustomRules(tournament.rules);
  const banned = parseCustomRules(tournament.banned_items);
  const tieBreak = tournament.tie_break_rules?.trim();
  const groups = defaultRuleGroups(tournament);

  return (
    <div className="space-y-4">
      {(custom.length > 0 || banned.length > 0 || tieBreak) && (
        <section className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-5">
          <h3 className="mb-3 flex items-center gap-2 text-lg">
            <ScrollText className="h-4 w-4 text-gold" /> From the organizer
          </h3>
          {custom.length > 0 && <RuleList rules={custom} accent />}
          {banned.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Banned in this tournament</p>
              <div className="flex flex-wrap gap-1.5">
                {banned.map((b) => (
                  <span key={b} className="rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}
          {tieBreak && (
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Tie-break: </span>
              {tieBreak}
            </p>
          )}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <section key={g.id} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary-soft">{g.icon}</span>
              {g.title}
            </h3>
            <RuleList rules={g.rules} />
          </section>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">These house rules apply to every Arena tournament. Organizer rules add to them and can't override fair play.</p>
    </div>
  );
}
