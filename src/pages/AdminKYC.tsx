import { CheckCircle2, Clock, Loader2, Search, Shield, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import type { Profile } from '@/types/database';

type KYCStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

interface KYCReview {
  profile: Profile;
  submitted_at: string;
}

export default function AdminKYC() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<KYCReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<KYCStatus | 'all'>('pending');
  const [selected, setSelected] = useState<KYCReview | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (!user) {
      navigate('/dashboard');
      return;
    }
    if (profile && profile.role !== 'admin') {
      toast.error('Access denied. Admin only.');
      navigate('/dashboard');
      return;
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchSubmissions();
    }
  }, [profile]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('kyc_status', ['pending', 'verified', 'rejected'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((p) => ({
        profile: p as Profile,
        submitted_at: p.updated_at || p.created_at,
      }));
      setSubmissions(mapped);
    } catch (error) {
      console.error('Error fetching KYC submissions:', error);
      toast.error('Failed to load KYC submissions');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.profile.kyc_status === statusFilter;
      const query = search.toLowerCase();
      const matchesSearch =
        item.profile.gamertag?.toLowerCase().includes(query) ||
        item.profile.email?.toLowerCase().includes(query) ||
        item.profile.username?.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [submissions, statusFilter, search]);

  const handleApprove = async (item: KYCReview) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'verified',
          kyc_rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.profile.id);

      if (error) throw error;

      toast.success(`${item.profile.gamertag} has been KYC verified`);
      await fetchSubmissions();
      setSelected(null);
    } catch (error) {
      console.error('Error approving KYC:', error);
      toast.error('Failed to approve KYC');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (item: KYCReview) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'rejected',
          kyc_rejection_reason: rejectionReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.profile.id);

      if (error) throw error;

      toast.success(`${item.profile.gamertag} KYC has been rejected`);
      setRejectionReason('');
      await fetchSubmissions();
      setSelected(null);
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      toast.error('Failed to reject KYC');
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status?: KYCStatus) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            Unverified
          </Badge>
        );
    }
  };

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="admin-header-title uppercase">KYC Verification Review</h1>
            <p className="text-[#64748b] font-inter font-light text-[15px]">
              Review and approve or reject identity verification submissions
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              Back to Admin
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setStatusFilter(value as KYCStatus | 'all');
            setSearch('');
          }}
          className="w-full"
        >
          <TabsList className="referee-tabs-list">
            <TabsTrigger value="pending" className="referee-tab uppercase">
              Pending
            </TabsTrigger>
            <TabsTrigger value="verified" className="referee-tab uppercase">
              Verified
            </TabsTrigger>
            <TabsTrigger value="rejected" className="referee-tab uppercase">
              Rejected
            </TabsTrigger>
            <TabsTrigger value="all" className="referee-tab uppercase">
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-8">
            <Card className="admin-card border-border">
              <CardHeader className="flex flex-col md:flex-row md:items-center gap-4 pb-4">
                <CardTitle className="text-lg text-white">Submissions</CardTitle>
                <div className="flex flex-1 flex-col md:flex-row gap-3 md:justify-end">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search gamertag, email, username..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-background border-border"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as KYCStatus | 'all')}
                  >
                    <SelectTrigger className="w-full md:w-44 bg-background border-border">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={fetchSubmissions}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="admin-table-header hover:bg-transparent border-none">
                        <TableHead className="admin-table-header">User</TableHead>
                        <TableHead className="admin-table-header">Extracted DOB</TableHead>
                        <TableHead className="admin-table-header">Status</TableHead>
                        <TableHead className="admin-table-header text-right">Submitted</TableHead>
                        <TableHead className="admin-table-header text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                          </TableCell>
                        </TableRow>
                      ) : filteredSubmissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                            No KYC submissions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSubmissions.map((item) => (
                          <TableRow key={item.profile.id} className="admin-table-row">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 border-none bg-white/5">
                                  <AvatarImage src={item.profile.avatar_url || ''} />
                                  <AvatarFallback className="bg-white/5 text-[10px]">
                                    {item.profile.gamertag?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-white font-semibold truncate">{item.profile.gamertag}</p>
                                  <p className="text-[#64748b] text-xs truncate">{item.profile.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white font-medium">
                              {item.profile.extracted_dob || '—'}
                            </TableCell>
                            <TableCell>{statusBadge(item.profile.kyc_status)}</TableCell>
                            <TableCell className="text-right text-[#64748b] font-inter text-[13px]">
                              {new Date(item.submitted_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {item.profile.kyc_status === 'pending' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                      onClick={() => handleApprove(item)}
                                      disabled={processing}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                      onClick={() => setSelected(item)}
                                      disabled={processing}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelected(item)}
                                  >
                                    View
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rejection / Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selected?.profile.kyc_status === 'pending' ? 'Reject KYC' : 'KYC Details'}
            </DialogTitle>
            <DialogDescription>
              {selected?.profile.kyc_status === 'pending'
                ? 'Provide a reason for the rejection. The user will see this and can resubmit.'
                : 'Review the submission details below.'}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selected.profile.avatar_url || ''} />
                  <AvatarFallback>{selected.profile.gamertag?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold">{selected.profile.gamertag}</p>
                  <p className="text-muted-foreground text-sm">{selected.profile.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Username</p>
                  <p className="text-white font-medium">{selected.profile.username}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="text-white font-medium">{selected.profile.location || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Extracted DOB</p>
                  <p className="text-white font-medium">{selected.profile.extracted_dob || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="text-white font-medium">
                    {new Date(selected.submitted_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {selected.profile.kyc_status === 'rejected' && (
                <div>
                  <p className="text-muted-foreground text-sm">Rejection Reason</p>
                  <p className="text-rose-400 text-sm mt-1">{selected.profile.kyc_rejection_reason}</p>
                </div>
              )}

              {selected.profile.kyc_status === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Rejection Reason</Label>
                  <Input
                    id="rejection-reason"
                    placeholder="e.g. Document unclear, date of birth could not be verified"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col md:flex-row gap-2">
            {selected?.profile.kyc_status === 'pending' && (
              <Button
                variant="outline"
                className="w-full md:w-auto border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => handleApprove(selected)}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            )}
            {selected?.profile.kyc_status === 'pending' && (
              <Button
                variant="outline"
                className="w-full md:w-auto border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                onClick={() => handleReject(selected)}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                Reject
              </Button>
            )}
            <Button
              variant="secondary"
              className="w-full md:w-auto"
              onClick={() => setSelected(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
