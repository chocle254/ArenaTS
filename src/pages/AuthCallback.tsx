import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Landing route for OAuth providers (Discord, Twitch). Supabase reads the
 * tokens from the URL automatically; we just wait for the session and move on.
 */
export default function AuthCallback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, '&'));
    const error = params.get('error_description') || params.get('error');
    if (error) {
      toast.error(decodeURIComponent(error.replace(/\+/g, ' ')));
      navigate('/sign-in', { replace: true });
      return;
    }
    if (loading) return;
    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }
    // Give the client a moment to exchange the code before giving up.
    const timer = setTimeout(() => {
      toast.error('Sign-in did not complete. Please try again.');
      navigate('/sign-in', { replace: true });
    }, 6000);
    return () => clearTimeout(timer);
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
