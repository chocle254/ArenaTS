import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/db/supabase';

export default function AdminSetup() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAdmin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-admin', {
        method: 'POST'
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
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>This will create an admin account with the following credentials:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Email: admin@admin.com</li>
                  <li>Password: Admin123</li>
                  <li>Role: Admin</li>
                </ul>
              </div>

              <Button 
                onClick={createAdmin} 
                disabled={loading}
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
                    You can now sign in with the admin credentials.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-semibold">Login Credentials:</p>
                <div className="bg-muted/50 p-3 rounded-lg space-y-1 font-mono text-xs">
                  <p>Email: admin@admin.com</p>
                  <p>Password: Admin123</p>
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
                onClick={createAdmin} 
                disabled={loading}
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
