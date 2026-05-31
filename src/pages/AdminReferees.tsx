import { Check, Gamepad2, MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefereeApplicationChat } from '@/components/RefereeApplicationChat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

interface Application {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles: {
    gamertag: string;
    avatar_url: string;
  };
}

const GAMES = [
  { id: 'codm', name: 'COD Mobile' },
  { id: 'fortnite', name: 'Fortnite' },
  { id: 'fifa', name: 'FIFA' },
  { id: 'warzone', name: 'Warzone' },
  { id: 'apex', name: 'Apex Legends' },
  { id: 'valorant', name: 'Valorant' },
  { id: 'injustice', name: 'Injustice' },
  { id: 'mortal_kombat', name: 'Mortal Kombat' },
  { id: 'efootball', name: 'eFootball' },
  { id: 'pubg_mobile', name: 'PUBG Mobile' }
];

export default function AdminReferees() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('referee_applications')
        .select('*, profiles(gamertag, avatar_url)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp || selectedGames.length === 0) {
      toast.error('Please select at least one game');
      return;
    }

    try {
      // 1. Update application status
      const { error: appError } = await supabase
        .from('referee_applications')
        .update({ status: 'approved' })
        .eq('id', selectedApp.id);

      if (appError) throw appError;

      // 2. Assign referee role to profile if not already
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'referee' })
        .eq('id', selectedApp.user_id);

      if (roleError) throw roleError;

      // 3. Create assignments
      const assignments = selectedGames.map(game => ({
        user_id: selectedApp.user_id,
        game: game
      }));

      const { error: assignError } = await supabase
        .from('referee_assignments')
        .insert(assignments);

      if (assignError) throw assignError;

      toast.success('Referee approved and assigned to games');
      setIsApproveOpen(false);
      setSelectedApp(null);
      fetchApplications();
    } catch (error) {
      console.error('Error approving referee:', error);
      toast.error('Failed to approve referee');
    }
  };

  const handleReject = async (appId: string) => {
    try {
      const { error } = await supabase
        .from('referee_applications')
        .update({ status: 'rejected' })
        .eq('id', appId);

      if (error) throw error;
      toast.success('Application rejected');
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="admin-header-title uppercase">Referee Applications</h1>
        <p className="text-[#64748b] font-inter font-light text-[15px]">Manage user applications to become officials</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[750px]">
        {/* Applications List */}
        <div className="md:col-span-4 admin-table-container flex flex-col">
          <div className="p-4 admin-table-header border-b border-white/5">
            Applicants
          </div>
          <ScrollArea className="flex-1">
            <div className="">
              {applications.length === 0 ? (
                <div className="p-8 text-center text-[#64748b] font-light">No applications yet</div>
              ) : (
                applications.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className={`referee-applicant-card w-full text-left ${
                      selectedApp?.id === app.id ? 'selected' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10 border-none bg-white/5">
                      <AvatarImage src={app.profiles.avatar_url} />
                      <AvatarFallback className="bg-white/5">{app.profiles.gamertag[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{app.profiles.gamertag}</p>
                      <p className="text-[11px] text-[#64748b]">{new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    {app.status === 'pending' ? (
                      <span className="admin-badge-pending">Pending</span>
                    ) : (
                      <Badge variant={app.status === 'approved' ? 'default' : 'destructive'} className="text-[10px] uppercase tracking-wider">
                        {app.status}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat & Details Area */}
        <div className="md:col-span-8 admin-table-container flex flex-col">
          {selectedApp ? (
            <div className="flex flex-col h-full">
              <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-none bg-white/5">
                    <AvatarImage src={selectedApp.profiles.avatar_url} />
                    <AvatarFallback className="bg-white/5">{selectedApp.profiles.gamertag[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedApp.profiles.gamertag}</h2>
                    <p className="text-sm text-[#64748b]">Applying for Referee</p>
                  </div>
                </div>
                {selectedApp.status === 'pending' && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsApproveOpen(true)}
                      className="btn-approve flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                    <button 
                      onClick={() => handleReject(selectedApp.id)}
                      className="btn-reject flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden p-6">
                <div className="referee-application-chat-title">
                  Referee Application Chat
                </div>
                <RefereeApplicationChat 
                  applicationId={selectedApp.id} 
                  userId={user!.id} 
                  isAdmin={true} 
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#64748b]">
              <MessageCircle className="h-20 w-20 opacity-10 mb-6" />
              <p className="font-light text-lg">Select an applicant to view details and chat</p>
            </div>
          )}
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0f0f1a] border-white/10 max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white font-rajdhani text-2xl uppercase tracking-wider">Approve Referee</DialogTitle>
            <DialogDescription className="text-[#64748b]">
              Select the games this referee will be responsible for.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-6">
            {GAMES.map((game) => (
              <div key={game.id} className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                <Checkbox 
                  id={game.id} 
                  checked={selectedGames.includes(game.id)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedGames([...selectedGames, game.id]);
                    else setSelectedGames(selectedGames.filter(id => id !== game.id));
                  }}
                  className="border-white/30 data-[state=checked]:bg-[#7c3aed] data-[state=checked]:border-[#7c3aed]"
                />
                <Label htmlFor={game.id} className="text-sm font-medium text-white/80 cursor-pointer">
                  {game.name}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <button onClick={handleApprove} className="w-full btn-approve py-3 uppercase tracking-widest text-sm">
              Confirm Approval
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
