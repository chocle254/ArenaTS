import { Lock, Save, User } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

export default function Settings() {
  const { user, profile } = useAuth();
  const [gamertag, setGamertag] = useState(profile?.gamertag || '');
  const [twitchHandle, setTwitchHandle] = useState(profile?.twitch_handle || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!gamertag.trim()) {
      toast.error('Please enter a valid gamertag');
      return;
    }

    setLoadingProfile(true);
    try {
      let sanitizedTwitch = twitchHandle.trim();
      // Remove URL if provided
      if (sanitizedTwitch.includes('twitch.tv/')) {
        sanitizedTwitch = sanitizedTwitch.split('twitch.tv/').pop()?.split('/')[0] || sanitizedTwitch;
      }
      // Remove leading @
      sanitizedTwitch = sanitizedTwitch.replace(/^@/, '');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          gamertag: gamertag.trim(),
          twitch_handle: sanitizedTwitch || null
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground font-light">Manage your account settings and preferences</p>
      </div>

      <Separator />

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-light">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription className="font-light">
            Update your display name and streaming accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gamertag" className="font-light">Gamertag</Label>
                <Input
                  id="gamertag"
                  type="text"
                  value={gamertag}
                  onChange={(e) => setGamertag(e.target.value)}
                  placeholder="Enter your gamertag"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitch" className="font-light">Twitch Username</Label>
                <Input
                  id="twitch"
                  type="text"
                  value={twitchHandle}
                  onChange={(e) => setTwitchHandle(e.target.value)}
                  placeholder="Your Twitch channel name"
                />
              </div>
            </div>
            <Button type="submit" disabled={loadingProfile}>
              <Save className="h-4 w-4 mr-2" />
              {loadingProfile ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-light">
            <Lock className="h-5 w-5" />
            Password
          </CardTitle>
          <CardDescription className="font-light">
            Change your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="font-light">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-light">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="font-light">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="max-w-md"
              />
            </div>
            <Button type="submit" disabled={loadingPassword}>
              <Save className="h-4 w-4 mr-2" />
              {loadingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
