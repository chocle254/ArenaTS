import { Swords, Users } from 'lucide-react';
import { useState } from 'react';
import { ActiveChallengesList } from '@/components/ActiveChallengesList';
import { OnlinePlayers } from '@/components/OnlinePlayers';
import { OnlineTeams } from '@/components/OnlineTeams';
import { PastChallengesList } from '@/components/PastChallengesList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function QuickMatch() {
  const [activeTab, setActiveTab] = useState('1v1');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Swords className="h-8 w-8 text-primary" />
          Quick Match
        </h1>
        <p className="text-muted-foreground font-light">
          Find available players or teams online and challenge them to a direct match.
        </p>
      </div>

      {/* Active Quick Match Live Cards */}
      <ActiveChallengesList />

      <Tabs defaultValue="1v1" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-muted/30 border-border/50 p-1">
          <TabsTrigger value="1v1" className="gap-2">
            <Users className="h-4 w-4" />
            1v1 Duels
          </TabsTrigger>
          <TabsTrigger value="tdm" className="gap-2">
            <Users className="h-4 w-4" />
            Team Deathmatch (5v5)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="1v1" className="mt-8 space-y-8">
          <OnlinePlayers />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glassmorphism-card p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                1v1 Quick Match
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 font-light">
                <li>Choose an opponent from the list of online players.</li>
                <li>Send a challenge with your preferred game and entry fee.</li>
                <li>If they accept, a match room will be created instantly.</li>
                <li>Both players report the score after the match is completed.</li>
              </ul>
            </div>
            
            <div className="glassmorphism-card p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-amber-500">
                1v1 Rules
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 font-light">
                <li>Compulsory Streaming: You MUST start your Twitch stream before pressing 'I\'m Ready'.</li>
                <li>Screenshot evidence is required for all match reports.</li>
                <li>Entry fees are held in escrow until a winner is confirmed.</li>
                <li>Mismatching reports will trigger an automatic dispute.</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tdm" className="mt-8 space-y-8">
          <OnlineTeams />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glassmorphism-card p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-primary font-display tracking-tight">
                Team Deathmatch (5v5)
              </h3>
              <p className="text-sm text-muted-foreground font-light">
                Battle other teams in intense 5v5 action. Only teams with 5 members can participate.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 font-light">
                <li>Register your team of 5 in the Team Management section.</li>
                <li>Challenge other online teams when all your members are ready.</li>
                <li>Matches will be automatically canceled if a member goes offline.</li>
                <li>Prizes are split equally among all 5 team members.</li>
              </ul>
            </div>
            
            <div className="glassmorphism-card p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500 font-display tracking-tight">
                Team Match Rules
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 font-light">
                <li>Compulsory Streaming: You MUST start your Twitch stream before pressing 'I\'m Ready'.</li>
                <li>All 5 team members must check in within 5 minutes of acceptance.</li>
                <li>Captain handles the challenge and result reporting.</li>
                <li>Screen recordings are recommended for team matches.</li>
                <li>Fair play is strictly enforced; cheating leads to team ban.</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Past Challenges Section */}
      <PastChallengesList />
    </div>
  );
}
