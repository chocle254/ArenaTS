import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/db/supabase';

export default function AdminSetup() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [secret, setSecret] = useState('');

  const createAdmin = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-admin', {
        method: 'POST',
        body: { email, password, gamertag, secret },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
      toast.success('Admin account created successfully!');
    } catch (err: any) {
      console.error('Error creating admin:', err);
      const errorMessage = err.message || 'Failed to create admin account';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#08090E' }}>
      <Card className="w-full max-w-md backdrop-blur-card border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-display gradient-text">Admin Setup</CardTitle>
          <CardDescription>
            Create the admin account for ARENA platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!success && !error && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Admin password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-gamertag">Gamertag (optional)</Label>
                  <Input
                    id="admin-gamertag"
                    type="text"
                    value={gamertag}
                    onChange={(e) => setGamertag(e.target.value)}
                    placeholder="Admin"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-secret">Setup secret</Label>
                  <Input
                    id="admin-secret"
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Provided separately, not shown here"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Matches the ADMIN_SETUP_SECRET set on the server. Anyone without it cannot create an admin account.
                  </p>
                </div>
              </div>

              <Button 
                onClick={createAdmin} 
                disabled={loading || !email || !password || !secret}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Admin Account
              </Button>
            </>
          )}

          {success && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-green-500">Admin Account Created!</p>
                  <p className="text-sm text-muted-foreground">
                    You can now sign in with the credentials you just set.
                  </p>
                </div>
              </div>

              <Button 
                onClick={() => window.location.href = '/sign-in'}
                className="w-full"
              >
                Go to Sign In
              </Button>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-500">Error Creating Admin</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>

              <Button 
                onClick={() => setError(null)} 
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
