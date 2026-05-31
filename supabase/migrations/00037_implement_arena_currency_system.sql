-- Add arena_currency and feedback_submitted to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS arena_currency numeric(12,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS feedback_submitted boolean DEFAULT false;

-- Update all existing users to have 100 Arena Currency
UPDATE profiles SET arena_currency = 100.00;

-- Create platform_settings table for demo mode and maintenance balance
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_demo_mode boolean DEFAULT true,
  maintenance_balance numeric(12,2) DEFAULT 0.00,
  updated_at timestamptz DEFAULT now()
);

-- Insert initial settings
INSERT INTO platform_settings (is_demo_mode, maintenance_balance)
VALUES (true, 0.00);

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_text text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  submitted_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Policies for user_feedback
CREATE POLICY "Users can submit their own feedback" ON user_feedback
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback" ON user_feedback
  FOR SELECT 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policies for platform_settings
CREATE POLICY "Anyone can view platform settings" ON platform_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can update platform settings" ON platform_settings
  FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Delete all existing tournaments and related data (CLEANUP)
DELETE FROM match_results;
DELETE FROM tournament_participants;
DELETE FROM tournament_team_members;
DELETE FROM tournament_teams;
DELETE FROM tournament_reminders;
DELETE FROM tournaments;

-- Delete all transaction history
DELETE FROM transactions;

-- Reset user statistics
UPDATE profiles SET
  total_earnings = 0,
  tournaments_played = 0,
  wins = 0,
  losses = 0,
  win_rate = 0,
  current_streak = 0,
  longest_streak = 0,
  available_balance = 0,
  pending_balance = 0;
