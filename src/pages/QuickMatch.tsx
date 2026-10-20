import { ChevronDown, Swords, Users } from 'lucide-react';
import { ActiveChallengesList } from '@/components/ActiveChallengesList';
import { TeamManager } from '@/components/arena/TeamManager';
import { OnlinePlayers } from '@/components/OnlinePlayers';
import { OnlineTeams } from '@/components/OnlineTeams';
import { PastChallengesList } from '@/components/PastChallengesList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STEPS = [
  { title: 'Pick an opponent', text: 'Anyone online below, or a friend from Chats.' },
  { title: 'Set the stake', text: 'Both players stake the same. Winner takes 90% of the pot.' },
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
        <p className="text-muted-foreground">Challenge a player right now and play for Arena Currency.</p>
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
              'Start your Twitch stream before you press “I’m ready”. Matches without a stream can be voided.',
              'Screenshot evidence is required for every result.',
              'Stakes are held until the winner is confirmed, and refunded if the challenge is declined or expires.',
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
              'Start your Twitch stream before pressing “I’m ready”. Screen recordings are recommended.',
              'Prizes are split equally between the five players. Cheating gets the whole team banned.',
            ]}
          />
        </TabsContent>
      </Tabs>

      <PastChallengesList />
    </div>
  );
}
