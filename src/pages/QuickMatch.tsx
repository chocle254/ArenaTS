import { ChevronDown, Swords, Users } from 'lucide-react';
import { ActiveChallengesList } from '@/components/ActiveChallengesList';
import { TeamManager } from '@/components/arena/TeamManager';
import { OnlinePlayers } from '@/components/OnlinePlayers';
import { OnlineTeams } from '@/components/OnlineTeams';
import { PastChallengesList } from '@/components/PastChallengesList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { XP_RULES } from '@/lib/progression';

const STEPS = [
  { title: 'Pick an opponent', text: 'Anyone online below, or a friend from Chats.' },
  { title: 'Play free', text: `Win for +${XP_RULES.win} XP, lose for +${XP_RULES.loss}. Climb the leaderboard.` },
  { title: 'Play and report', text: 'Both report the winner with a screenshot. Clashes go to a referee.' },
];

function Rules({ items }: { items: string[] }) {
  return (
    <details className="group surface p-4 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
        Match rules
        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        {items.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </details>
  );
}

export default function QuickMatch() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-4xl">Quick match</h1>
        <p className="text-muted-foreground">Challenge a player right now. Free to play, for XP and rank. Stream it on Twitch and it shows on the Streams page.</p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-2xl border border-border bg-card/70 p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-score text-base font-bold text-primary-soft">{i + 1}</span>
            <span>
              <span className="block text-sm font-semibold">{s.title}</span>
              <span className="block text-xs text-muted-foreground">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>

      {/* Your challenges in progress */}
      <ActiveChallengesList />

      <Tabs defaultValue="1v1" className="w-full">
        <TabsList>
          <TabsTrigger value="1v1" className="gap-2">
            <Swords className="h-4 w-4" /> 1v1 duels
          </TabsTrigger>
          <TabsTrigger value="tdm" className="gap-2">
            <Users className="h-4 w-4" /> 5v5 squads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="1v1" className="mt-6 space-y-6">
          <OnlinePlayers />
          <Rules
            items={[
              'Streaming is optional. Turn on “Stream this match” in the match room and it shows on the Streams page.',
              'Screenshot evidence is required for every result.',
              'Quick matches are free. Wins and losses count toward your XP and rank (first 3 a day against the same player).',
              'If the two reports disagree, a referee reviews the evidence and decides.',
            ]}
          />
        </TabsContent>

        <TabsContent value="tdm" className="mt-6 space-y-6">
          <TeamManager />
          <OnlineTeams />
          <Rules
            items={[
              'Only full teams of five can send or accept 5v5 challenges. The captain sends the challenge and reports the result.',
              'All five players check in within 5 minutes of the challenge being accepted.',
              'Screen recordings are recommended in case of a dispute.',
              'Cheating gets the whole team banned.',
            ]}
          />
        </TabsContent>
      </Tabs>

      <PastChallengesList />
    </div>
  );
}
