
-- ============================================================
-- Migration: 00001_create_initial_schema.sql
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.game_type AS ENUM ('codm', 'fortnite', 'fifa', 'warzone', 'apex', 'valorant');
CREATE TYPE public.tournament_status AS ENUM ('open', 'active', 'completed', 'cancelled');
CREATE TYPE public.tournament_format AS ENUM ('solo', 'duo', 'squad');
CREATE TYPE public.bracket_type AS ENUM ('single_elimination', 'double_elimination', 'round_robin');
CREATE TYPE public.match_status AS ENUM ('upcoming', 'live', 'completed', 'disputed');
CREATE TYPE public.dispute_status AS ENUM ('open', 'reviewing', 'resolved');
CREATE TYPE public.dispute_type AS ENUM ('wrong_score', 'cheating', 'no_show', 'technical_issue');
CREATE TYPE public.payout_status AS ENUM ('pending', 'approved', 'sent', 'failed', 'rejected');
CREATE TYPE public.transaction_type AS ENUM ('credit', 'debit', 'withdrawal', 'refund');
CREATE TYPE public.order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');

-- Profiles table (synced from auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'user'::public.user_role,
  gamertag text UNIQUE,
  avatar_url text,
  bio text,
  favorite_games public.game_type[] DEFAULT '{}',
  total_earnings numeric(12,2) DEFAULT 0,
  tournaments_played integer DEFAULT 0,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  win_rate numeric(5,2) DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  global_rank integer,
  tier text DEFAULT 'Bronze',
  disputes_filed integer DEFAULT 0,
  disputes_won integer DEFAULT 0,
  is_suspended boolean DEFAULT false,
  suspension_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Gamertags table (stores game-specific IDs)
CREATE TABLE public.gamertags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game public.game_type NOT NULL,
  gamertag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, game)
);

-- Tournaments table
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  game public.game_type NOT NULL,
  description text,
  rules text,
  format public.tournament_format NOT NULL,
  bracket_type public.bracket_type NOT NULL,
  max_players integer NOT NULL,
  current_players integer DEFAULT 0,
  entry_fee numeric(12,2) NOT NULL,
  prize_pool numeric(12,2) DEFAULT 0,
  prize_distribution jsonb NOT NULL,
  platform_fee_percentage numeric(5,2) DEFAULT 10,
  status public.tournament_status DEFAULT 'open'::public.tournament_status,
  start_time timestamptz NOT NULL,
  check_in_window integer DEFAULT 30,
  match_time_limit integer DEFAULT 60,
  score_reporting_type text DEFAULT 'screenshot_required',
  tie_break_rules text,
  banned_items text,
  rounds_to_win integer DEFAULT 1,
  created_by uuid REFERENCES public.profiles(id),
  featured boolean DEFAULT false,
  bracket jsonb DEFAULT '{"rounds": []}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tournament participants table
CREATE TABLE public.tournament_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gamertag text NOT NULL,
  bracket_seed integer,
  checked_in boolean DEFAULT false,
  eliminated boolean DEFAULT false,
  final_position integer,
  prize_won numeric(12,2) DEFAULT 0,
  paid_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Matches table
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round integer NOT NULL,
  match_number integer NOT NULL,
  player1_id uuid REFERENCES public.profiles(id),
  player2_id uuid REFERENCES public.profiles(id),
  player1_score integer,
  player2_score integer,
  player1_submitted boolean DEFAULT false,
  player2_submitted boolean DEFAULT false,
  winner_id uuid REFERENCES public.profiles(id),
  status public.match_status DEFAULT 'upcoming'::public.match_status,
  decided_by text DEFAULT 'players',
  admin_note text,
  scheduled_time timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Match chat messages table
CREATE TABLE public.match_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  message text NOT NULL,
  is_system_message boolean DEFAULT false,
  attachments text[],
  created_at timestamptz DEFAULT now()
);

-- Disputes table
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  filed_by uuid NOT NULL REFERENCES public.profiles(id),
  dispute_type public.dispute_type NOT NULL,
  description text NOT NULL,
  evidence text[],
  status public.dispute_status DEFAULT 'open'::public.dispute_status,
  admin_id uuid REFERENCES public.profiles(id),
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Wallet transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount numeric(12,2) NOT NULL,
  description text NOT NULL,
  tournament_id uuid REFERENCES public.tournaments(id),
  match_id uuid REFERENCES public.matches(id),
  created_at timestamptz DEFAULT now()
);

-- Payouts table
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  payment_method text NOT NULL,
  status public.payout_status DEFAULT 'pending'::public.payout_status,
  stripe_transfer_id text,
  admin_id uuid REFERENCES public.profiles(id),
  admin_note text,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Orders table for Stripe payments
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  tournament_id uuid REFERENCES public.tournaments(id),
  items jsonb NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status public.order_status NOT NULL DEFAULT 'pending'::public.order_status,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  customer_email text,
  customer_name text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create storage bucket for avatars and evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false);

-- Indexes for performance
CREATE INDEX idx_profiles_gamertag ON public.profiles(gamertag);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_tournaments_status ON public.tournaments(status);
CREATE INDEX idx_tournaments_game ON public.tournaments(game);
CREATE INDEX idx_tournaments_start_time ON public.tournaments(start_time);
CREATE INDEX idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_match_messages_match ON public.match_messages(match_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_stripe_session_id ON public.orders(stripe_session_id);
CREATE INDEX idx_orders_status ON public.orders(status);
-- ============================================================
-- Migration: 00002_create_auth_trigger_and_policies_fixed.sql
-- ============================================================

-- Auth trigger to sync users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = uid AND p.role = role_name::user_role
  );
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamertags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile except role" ON profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Anyone can view public profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Gamertags policies
CREATE POLICY "Users can manage their own gamertags" ON gamertags
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view gamertags" ON gamertags
  FOR SELECT TO authenticated USING (true);

-- Tournaments policies
CREATE POLICY "Anyone can view open tournaments" ON tournaments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create tournaments" ON tournaments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their tournaments" ON tournaments
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all tournaments" ON tournaments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Tournament participants policies
CREATE POLICY "Anyone can view participants" ON tournament_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join tournaments" ON tournament_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage participants" ON tournament_participants
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Matches policies
CREATE POLICY "Anyone can view matches" ON matches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Players can update their match scores" ON matches
  FOR UPDATE TO authenticated 
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Admins can manage all matches" ON matches
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Match messages policies
CREATE POLICY "Match participants can view messages" ON match_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_messages.match_id
      AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    ) OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Match participants can send messages" ON match_messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_messages.match_id
      AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
  );

CREATE POLICY "Admins can send system messages" ON match_messages
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

-- Disputes policies
CREATE POLICY "Users can view their own disputes" ON disputes
  FOR SELECT TO authenticated USING (
    auth.uid() = filed_by OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can file disputes" ON disputes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = filed_by);

CREATE POLICY "Admins can manage disputes" ON disputes
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Payouts policies
CREATE POLICY "Users can view their own payouts" ON payouts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can request payouts" ON payouts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage payouts" ON payouts
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage orders" ON orders
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for evidence bucket
CREATE POLICY "Match participants can view evidence" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'evidence' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Users can upload evidence" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'evidence' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
-- ============================================================
-- Migration: 00003_add_checkin_timestamp_to_participants.sql
-- ============================================================

-- Add check-in timestamp to tournament_participants
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Create index for faster check-in queries
CREATE INDEX IF NOT EXISTS idx_tournament_participants_checked_in ON tournament_participants(checked_in, checked_in_at);
-- ============================================================
-- Migration: 00004_make_gamertag_nullable.sql
-- ============================================================

-- Make gamertag nullable since users might not have set it yet
ALTER TABLE tournament_participants ALTER COLUMN gamertag DROP NOT NULL;
-- ============================================================
-- Migration: 00005_create_game_accounts_table.sql
-- ============================================================

-- Create game_accounts table to store in-game names for each game
CREATE TABLE IF NOT EXISTS game_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game game_type NOT NULL,
  in_game_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, game)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_accounts_user_id ON game_accounts(user_id);

-- RLS Policies
ALTER TABLE game_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own game accounts
CREATE POLICY "Users can view own game accounts" ON game_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own game accounts
CREATE POLICY "Users can insert own game accounts" ON game_accounts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own game accounts
CREATE POLICY "Users can update own game accounts" ON game_accounts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own game accounts
CREATE POLICY "Users can delete own game accounts" ON game_accounts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "Admins have full access to game accounts" ON game_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));
-- ============================================================
-- Migration: 00006_update_handle_new_user_with_metadata.sql
-- ============================================================

-- Update handle_new_user function to sync additional profile fields from metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  user_gamertag text;
  user_favorite_games game_type[];
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Extract gamertag from metadata
  user_gamertag := NEW.raw_user_meta_data->>'gamertag';
  
  -- Extract favorite_games from metadata (stored as JSON array)
  IF NEW.raw_user_meta_data->>'favorite_games' IS NOT NULL THEN
    user_favorite_games := ARRAY(
      SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'favorite_games')::game_type
    );
  ELSE
    user_favorite_games := ARRAY[]::game_type[];
  END IF;
  
  -- Insert a profile synced with fields collected at signup
  INSERT INTO public.profiles (id, email, phone, role, gamertag, favorite_games)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    user_gamertag,
    user_favorite_games
  );
  
  RETURN NEW;
END;
$$;
-- ============================================================
-- Migration: 00007_create_match_results_table.sql
-- ============================================================

-- Create match results table
CREATE TABLE IF NOT EXISTS match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id text NOT NULL,
  round integer NOT NULL,
  player1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player1_reported_winner uuid REFERENCES profiles(id),
  player2_reported_winner uuid REFERENCES profiles(id),
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed')),
  winner_id uuid REFERENCES profiles(id),
  admin_override boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id, match_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_match_results_tournament ON match_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_results_status ON match_results(status);
CREATE INDEX IF NOT EXISTS idx_match_results_players ON match_results(player1_id, player2_id);

-- Enable RLS
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Policies for match results
CREATE POLICY "Anyone can view match results" ON match_results
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Players can insert their match results" ON match_results
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = player1_id OR auth.uid() = player2_id
  );

CREATE POLICY "Players can update their own reports" ON match_results
  FOR UPDATE TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id)
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Admins can update any match results" ON match_results
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
-- ============================================================
-- Migration: 00008_create_storage_policies_for_screenshots.sql
-- ============================================================

-- Storage policies for tournament screenshots
DROP POLICY IF EXISTS "Anyone can view tournament screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload screenshots" ON storage.objects;

CREATE POLICY "Anyone can view tournament screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'tournament_screenshots');

CREATE POLICY "Authenticated users can upload screenshots" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tournament_screenshots');
-- ============================================================
-- Migration: 00009_enable_realtime_for_match_results.sql
-- ============================================================

-- Enable Realtime for match_results table
ALTER PUBLICATION supabase_realtime ADD TABLE match_results;
-- ============================================================
-- Migration: 00010_fix_match_messages_final.sql
-- ============================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can send system messages" ON match_messages;
DROP POLICY IF EXISTS "Match participants can send messages" ON match_messages;
DROP POLICY IF EXISTS "Match participants can view messages" ON match_messages;

-- Drop foreign key constraint if exists
ALTER TABLE match_messages DROP CONSTRAINT IF EXISTS match_messages_match_id_fkey;

-- Add tournament_id column
ALTER TABLE match_messages 
ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE;

-- Update match_id to text type
ALTER TABLE match_messages 
ALTER COLUMN match_id TYPE text;

-- Create index
CREATE INDEX IF NOT EXISTS idx_match_messages_match ON match_messages(tournament_id, match_id);

-- Create new simple policies
CREATE POLICY "Users can view all messages" ON match_messages
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can send messages" ON match_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE match_messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
-- ============================================================
-- Migration: 00011_add_match_timing_fields.sql
-- ============================================================

-- Add timing fields to match_results table
ALTER TABLE match_results
ADD COLUMN IF NOT EXISTS match_started_at timestamptz,
ADD COLUMN IF NOT EXISTS match_deadline timestamptz,
ADD COLUMN IF NOT EXISTS match_duration_minutes integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS time_extended_by_admin integer DEFAULT 0;

-- Add default match duration to tournaments
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS default_match_duration_minutes integer DEFAULT 30;

-- Create function to auto-start match when both players are assigned
CREATE OR REPLACE FUNCTION auto_start_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set match start time and deadline when match result is created
  IF NEW.match_started_at IS NULL THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-starting matches
DROP TRIGGER IF EXISTS auto_start_match_trigger ON match_results;
CREATE TRIGGER auto_start_match_trigger
  BEFORE INSERT ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION auto_start_match();
-- ============================================================
-- Migration: 00012_add_check_in_system.sql
-- ============================================================

-- Add check-in fields to match_results table
ALTER TABLE match_results
ADD COLUMN IF NOT EXISTS player1_checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS player2_checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS check_in_deadline timestamptz,
ADD COLUMN IF NOT EXISTS both_players_ready boolean DEFAULT false;

-- Update auto_start_match function to handle check-in
CREATE OR REPLACE FUNCTION auto_start_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only set check-in deadline when BOTH players are present.
  -- If only one slot is filled, leave NULL and wait for second player.
  IF NEW.check_in_deadline IS NULL
    AND NEW.player1_id IS NOT NULL
    AND NEW.player2_id IS NOT NULL
  THEN
    NEW.check_in_deadline := now() + interval '5 minutes';
  END IF;

  -- Only start match timer when both players have checked in
  IF NEW.player1_checked_in AND NEW.player2_checked_in AND NEW.match_started_at IS NULL THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
    NEW.both_players_ready := true;
  END IF;

  RETURN NEW;
END;
$$;

-- Create function to handle check-in
CREATE OR REPLACE FUNCTION handle_player_check_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When both players check in, start the match timer
  IF NEW.player1_checked_in AND NEW.player2_checked_in AND OLD.both_players_ready = false THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
    NEW.both_players_ready := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for check-in updates
DROP TRIGGER IF EXISTS handle_check_in_trigger ON match_results;
CREATE TRIGGER handle_check_in_trigger
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  WHEN (OLD.player1_checked_in IS DISTINCT FROM NEW.player1_checked_in 
        OR OLD.player2_checked_in IS DISTINCT FROM NEW.player2_checked_in)
  EXECUTE FUNCTION handle_player_check_in();
-- ============================================================
-- Migration: 00013_add_team_support_to_tournaments.sql
-- ============================================================


-- Add mode and team_size to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS team_size integer DEFAULT 1;

-- Create teams table
CREATE TABLE IF NOT EXISTS tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  captain_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id, team_name)
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS tournament_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Add team_id to match_results (keep player_id for backward compatibility)
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS team1_id uuid REFERENCES tournament_teams(id) ON DELETE SET NULL;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS team2_id uuid REFERENCES tournament_teams(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_teams
CREATE POLICY "Anyone can view teams" ON tournament_teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON tournament_teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = captain_id);
CREATE POLICY "Team captains can update their teams" ON tournament_teams FOR UPDATE TO authenticated USING (auth.uid() = captain_id);
CREATE POLICY "Team captains can delete their teams" ON tournament_teams FOR DELETE TO authenticated USING (auth.uid() = captain_id);

-- RLS Policies for tournament_team_members
CREATE POLICY "Anyone can view team members" ON tournament_team_members FOR SELECT USING (true);
CREATE POLICY "Team captains can add members" ON tournament_team_members FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournament_teams
    WHERE id = team_id AND captain_id = auth.uid()
  )
);
CREATE POLICY "Team captains and members can remove themselves" ON tournament_team_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM tournament_teams
    WHERE id = team_id AND captain_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_members_team_id ON tournament_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_members_user_id ON tournament_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_match_results_team1_id ON match_results(team1_id);
CREATE INDEX IF NOT EXISTS idx_match_results_team2_id ON match_results(team2_id);

-- ============================================================
-- Migration: 00014_add_creator_contribution_to_tournaments.sql
-- ============================================================


-- Add creator_contribution field to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS creator_contribution numeric DEFAULT 0;

-- Create function to calculate prize pool
CREATE OR REPLACE FUNCTION calculate_prize_pool(
  p_tournament_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_fee numeric;
  v_current_players integer;
  v_creator_contribution numeric;
  v_platform_fee_percentage numeric;
  v_total_collected numeric;
  v_platform_fee numeric;
  v_prize_pool numeric;
BEGIN
  -- Get tournament details
  SELECT entry_fee, current_players, creator_contribution, platform_fee_percentage
  INTO v_entry_fee, v_current_players, v_creator_contribution, v_platform_fee_percentage
  FROM tournaments
  WHERE id = p_tournament_id;
  
  -- If entry fee is 0, return the manually set prize pool
  IF v_entry_fee = 0 THEN
    SELECT prize_pool INTO v_prize_pool FROM tournaments WHERE id = p_tournament_id;
    RETURN v_prize_pool;
  END IF;
  
  -- Calculate prize pool for paid tournaments
  v_total_collected := v_entry_fee * v_current_players;
  v_platform_fee := v_total_collected * (v_platform_fee_percentage / 100);
  v_prize_pool := v_total_collected - v_platform_fee + COALESCE(v_creator_contribution, 0);
  
  RETURN v_prize_pool;
END;
$$;

-- Create trigger to update prize pool when participants change
CREATE OR REPLACE FUNCTION update_tournament_prize_pool()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update if entry fee > 0
  IF NEW.entry_fee > 0 THEN
    NEW.prize_pool := calculate_prize_pool(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_prize_pool ON tournaments;
CREATE TRIGGER trigger_update_prize_pool
  BEFORE UPDATE OF current_players, creator_contribution
  ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_tournament_prize_pool();

-- ============================================================
-- Migration: 00015_update_prize_pool_logic_to_manual.sql
-- ============================================================


-- Drop the trigger and function for automatic prize pool calculation
DROP TRIGGER IF EXISTS trigger_update_prize_pool ON tournaments;
DROP FUNCTION IF EXISTS update_tournament_prize_pool();
DROP FUNCTION IF EXISTS calculate_prize_pool(uuid);

-- The prize pool is now always set manually by the creator
-- The 10% platform fee will be deducted when distributing prizes to winners
-- No automatic calculation needed

-- ============================================================
-- Migration: 00016_auto_update_tournament_status_to_completed.sql
-- ============================================================


-- Create function to check and update tournament status to completed
CREATE OR REPLACE FUNCTION check_and_update_tournament_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update tournaments to 'completed' if they've been live/active for more than 3 hours
  UPDATE tournaments
  SET status = 'completed'
  WHERE status IN ('live', 'active')
  AND start_time < NOW() - INTERVAL '3 hours';
END;
$$;

-- Create function that can be called to get updated tournament status
CREATE OR REPLACE FUNCTION get_tournament_status(tournament_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_start_time timestamptz;
BEGIN
  SELECT status, start_time INTO v_status, v_start_time
  FROM tournaments
  WHERE id = tournament_id;
  
  -- If tournament is live/active and 3+ hours have passed, return 'completed'
  IF v_status IN ('live', 'active') AND v_start_time < NOW() - INTERVAL '3 hours' THEN
    -- Update the status in database
    UPDATE tournaments SET status = 'completed' WHERE id = tournament_id;
    RETURN 'completed';
  END IF;
  
  RETURN v_status;
END;
$$;

-- ============================================================
-- Migration: 00017_create_tournament_reminders_table.sql
-- ============================================================


-- Create tournament reminders table
CREATE TABLE IF NOT EXISTS tournament_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  reminder_24h boolean DEFAULT false,
  reminder_1h boolean DEFAULT false,
  reminder_15m boolean DEFAULT false,
  sent_24h boolean DEFAULT false,
  sent_1h boolean DEFAULT false,
  sent_15m boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tournament_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tournament_reminders_user_id ON tournament_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_reminders_tournament_id ON tournament_reminders(tournament_id);

-- RLS Policies
ALTER TABLE tournament_reminders ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view own reminders"
  ON tournament_reminders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own reminders
CREATE POLICY "Users can insert own reminders"
  ON tournament_reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reminders
CREATE POLICY "Users can update own reminders"
  ON tournament_reminders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own reminders
CREATE POLICY "Users can delete own reminders"
  ON tournament_reminders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to check and get due reminders
CREATE OR REPLACE FUNCTION get_due_reminders(p_user_id uuid)
RETURNS TABLE (
  reminder_id uuid,
  tournament_id uuid,
  tournament_name text,
  start_time timestamptz,
  reminder_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id as reminder_id,
    t.id as tournament_id,
    t.name as tournament_name,
    t.start_time,
    CASE
      WHEN tr.reminder_24h AND NOT tr.sent_24h AND t.start_time <= NOW() + INTERVAL '24 hours' AND t.start_time > NOW() THEN '24h'
      WHEN tr.reminder_1h AND NOT tr.sent_1h AND t.start_time <= NOW() + INTERVAL '1 hour' AND t.start_time > NOW() THEN '1h'
      WHEN tr.reminder_15m AND NOT tr.sent_15m AND t.start_time <= NOW() + INTERVAL '15 minutes' AND t.start_time > NOW() THEN '15m'
      ELSE NULL
    END as reminder_type
  FROM tournament_reminders tr
  JOIN tournaments t ON tr.tournament_id = t.id
  WHERE tr.user_id = p_user_id
  AND t.status IN ('open', 'live', 'active')
  AND (
    (tr.reminder_24h AND NOT tr.sent_24h AND t.start_time <= NOW() + INTERVAL '24 hours' AND t.start_time > NOW())
    OR (tr.reminder_1h AND NOT tr.sent_1h AND t.start_time <= NOW() + INTERVAL '1 hour' AND t.start_time > NOW())
    OR (tr.reminder_15m AND NOT tr.sent_15m AND t.start_time <= NOW() + INTERVAL '15 minutes' AND t.start_time > NOW())
  );
END;
$$;

-- Function to mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(p_reminder_id uuid, p_reminder_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_reminder_type = '24h' THEN
    UPDATE tournament_reminders SET sent_24h = true WHERE id = p_reminder_id;
  ELSIF p_reminder_type = '1h' THEN
    UPDATE tournament_reminders SET sent_1h = true WHERE id = p_reminder_id;
  ELSIF p_reminder_type = '15m' THEN
    UPDATE tournament_reminders SET sent_15m = true WHERE id = p_reminder_id;
  END IF;
END;
$$;

-- ============================================================
-- Migration: 00018_create_notifications_table.sql
-- ============================================================


-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('tournament', 'match', 'payment', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications (for edge functions)
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications 
  SET read = true, updated_at = NOW()
  WHERE id = p_notification_id 
  AND user_id = auth.uid();
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications 
  SET read = true, updated_at = NOW()
  WHERE user_id = auth.uid() 
  AND read = false;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE user_id = auth.uid() 
  AND read = false;
  
  RETURN v_count;
END;
$$;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- ============================================================
-- Migration: 00019_add_injustice_and_mortal_kombat_games.sql
-- ============================================================

-- Add new game types to the game_type enum
ALTER TYPE game_type ADD VALUE IF NOT EXISTS 'injustice';
ALTER TYPE game_type ADD VALUE IF NOT EXISTS 'mortal_kombat';
-- ============================================================
-- Migration: 00020_improve_tournament_status_updates.sql
-- ============================================================

-- Drop the old function
DROP FUNCTION IF EXISTS check_and_update_tournament_status();

-- Create improved function that handles all status transitions
CREATE OR REPLACE FUNCTION check_and_update_tournament_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update open tournaments to active when start time is reached
  UPDATE tournaments
  SET status = 'active'
  WHERE status = 'open'
  AND start_time <= NOW();

  -- Update active tournaments to completed after 3 hours
  UPDATE tournaments
  SET status = 'completed'
  WHERE status = 'active'
  AND start_time < NOW() - INTERVAL '3 hours';
END;
$$;
-- ============================================================
-- Migration: 00021_setup_authentication_and_security_v2.sql
-- ============================================================

-- Create trigger function to sync auth.users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Insert a profile synced with fields collected at signup
  INSERT INTO public.profiles (id, email, gamertag, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'gamertag', split_part(NEW.email, '@', 1)),
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  )
  ON CONFLICT (id) DO UPDATE
  SET email = COALESCE(EXCLUDED.email, profiles.email),
      gamertag = COALESCE(profiles.gamertag, EXCLUDED.gamertag);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user confirmation
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Also handle immediate signups (for Google OAuth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = uid AND p.role = role_name::user_role
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Create new RLS policies for profiles
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Create public_profiles view for shareable info
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT 
    id, 
    gamertag, 
    avatar_url, 
    bio, 
    favorite_games,
    total_earnings,
    tournaments_played,
    wins,
    losses,
    win_rate,
    current_streak,
    longest_streak,
    global_rank,
    tier,
    role
  FROM profiles;

-- Add banned_until and ban_reason columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_until timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason text;

-- Update disputes table to add missing columns
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS reported_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS admin_notes text;

-- Rename filed_by to reporter_id if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'filed_by') THEN
    ALTER TABLE disputes RENAME COLUMN filed_by TO reporter_id;
  END IF;
END $$;

-- Rename evidence to evidence_urls if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'evidence') THEN
    ALTER TABLE disputes RENAME COLUMN evidence TO evidence_urls;
  END IF;
END $$;

-- Rename admin_id to resolved_by if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'admin_id') THEN
    ALTER TABLE disputes RENAME COLUMN admin_id TO resolved_by;
  END IF;
END $$;

-- Create dispute_messages table for chat
CREATE TABLE IF NOT EXISTS dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid REFERENCES disputes(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS for disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all disputes" ON disputes;
DROP POLICY IF EXISTS "Users can view their own disputes" ON disputes;
DROP POLICY IF EXISTS "Users can create disputes" ON disputes;
DROP POLICY IF EXISTS "Admins can update disputes" ON disputes;

CREATE POLICY "Admins can view all disputes" ON disputes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own disputes" ON disputes
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR reported_user_id = auth.uid());

CREATE POLICY "Users can create disputes" ON disputes
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can update disputes" ON disputes
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS for dispute_messages
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their disputes" ON dispute_messages;
DROP POLICY IF EXISTS "Users can send messages in their disputes" ON dispute_messages;

CREATE POLICY "Users can view messages in their disputes" ON dispute_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_id
      AND (d.reporter_id = auth.uid() OR d.reported_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can send messages in their disputes" ON dispute_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_id
      AND (d.reporter_id = auth.uid() OR d.reported_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_reporter ON disputes(reporter_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reported_user ON disputes(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned_until) WHERE banned_until IS NOT NULL;
-- ============================================================
-- Migration: 00022_add_rate_limiting.sql
-- ============================================================

-- Create rate_limits table to track API request rates
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  endpoint text NOT NULL, -- API endpoint being rate limited
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON rate_limits(identifier, endpoint, window_start);

-- Function to clean up old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer,
  p_window_minutes integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start timestamptz;
  v_request_count integer;
  v_allowed boolean;
  v_reset_at timestamptz;
BEGIN
  -- Calculate window start (round down to window_minutes)
  v_window_start := date_trunc('minute', now()) - 
    (EXTRACT(minute FROM now())::integer % p_window_minutes) * interval '1 minute';
  
  -- Try to get existing record
  SELECT request_count INTO v_request_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start = v_window_start;
  
  IF v_request_count IS NULL THEN
    -- First request in this window
    INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, v_window_start);
    v_request_count := 1;
  ELSE
    -- Increment request count
    UPDATE rate_limits
    SET request_count = request_count + 1
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_start = v_window_start;
    v_request_count := v_request_count + 1;
  END IF;
  
  -- Check if limit exceeded
  v_allowed := v_request_count <= p_max_requests;
  v_reset_at := v_window_start + (p_window_minutes * interval '1 minute');
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'request_count', v_request_count,
    'limit', p_max_requests,
    'reset_at', v_reset_at,
    'retry_after', EXTRACT(EPOCH FROM (v_reset_at - now()))::integer
  );
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO anon;
-- ============================================================
-- Migration: 00023_create_challenges_table.sql
-- ============================================================

-- Create challenges table for 1v1 direct challenges
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game text NOT NULL CHECK (game IN ('codm', 'pubg', 'fortnite', 'valorant', 'apex', 'warzone', 'fifa', 'injustice', 'mortal_kombat')),
  stake_amount numeric(10, 2) NOT NULL CHECK (stake_amount > 0),
  prize_pool numeric(10, 2) NOT NULL,
  platform_fee numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  completed_at timestamptz,
  winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT different_players CHECK (challenger_id != opponent_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_challenges_opponent_status ON challenges(opponent_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON challenges(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Policies for challenges
CREATE POLICY "Users can view their own challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (
    auth.uid() = challenger_id OR 
    auth.uid() = opponent_id
  );

CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = challenger_id AND
    stake_amount >= 2 AND
    stake_amount <= 1000
  );

CREATE POLICY "Opponents can update challenge status"
  ON challenges FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = opponent_id AND
    status = 'pending'
  )
  WITH CHECK (
    status IN ('accepted', 'declined')
  );

CREATE POLICY "Challengers can cancel pending challenges"
  ON challenges FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = challenger_id AND
    status = 'pending'
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- Function to automatically expire challenges
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE challenges
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;

-- Function to calculate prize pool (stake * 2 - 10% fee)
CREATE OR REPLACE FUNCTION calculate_challenge_prize(stake numeric)
RETURNS TABLE (
  prize_pool numeric,
  platform_fee numeric
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (stake * 2 * 0.9)::numeric(10, 2) as prize_pool,
    (stake * 2 * 0.1)::numeric(10, 2) as platform_fee;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_challenges_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_challenges_updated_at();

-- ============================================================
-- Migration: 00024_create_wallet_and_transactions.sql
-- ============================================================

-- Add wallet fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS available_balance numeric(10, 2) DEFAULT 0 CHECK (available_balance >= 0),
ADD COLUMN IF NOT EXISTS pending_balance numeric(10, 2) DEFAULT 0 CHECK (pending_balance >= 0),
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD' CHECK (currency IN ('USD', 'KES', 'NGN', 'GHS', 'UGX', 'TZS')),
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'tournament_win', 'tournament_fee', 'refund')),
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  stripe_payment_intent_id text,
  stripe_payout_id text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON profiles(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update transaction updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- Function to update user balance
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id uuid,
  p_amount numeric,
  p_balance_type text -- 'available' or 'pending'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_balance_type = 'available' THEN
    UPDATE profiles
    SET available_balance = available_balance + p_amount
    WHERE id = p_user_id;
  ELSIF p_balance_type = 'pending' THEN
    UPDATE profiles
    SET pending_balance = pending_balance + p_amount
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- Function to transfer from pending to available
CREATE OR REPLACE FUNCTION transfer_pending_to_available(
  p_user_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    pending_balance = pending_balance - p_amount,
    available_balance = available_balance + p_amount
  WHERE id = p_user_id
    AND pending_balance >= p_amount;
END;
$$;

-- ============================================================
-- Migration: 00025_update_wallet_and_transactions.sql
-- ============================================================

-- Add wallet fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS available_balance numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_balance numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

-- Add new columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_payout_id text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON profiles(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

-- Function to update transaction updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- Function to update user balance
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id uuid,
  p_amount numeric,
  p_balance_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_balance_type = 'available' THEN
    UPDATE profiles
    SET available_balance = COALESCE(available_balance, 0) + p_amount
    WHERE id = p_user_id;
  ELSIF p_balance_type = 'pending' THEN
    UPDATE profiles
    SET pending_balance = COALESCE(pending_balance, 0) + p_amount
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- Function to transfer from pending to available
CREATE OR REPLACE FUNCTION transfer_pending_to_available(
  p_user_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    pending_balance = COALESCE(pending_balance, 0) - p_amount,
    available_balance = COALESCE(available_balance, 0) + p_amount
  WHERE id = p_user_id
    AND COALESCE(pending_balance, 0) >= p_amount;
END;
$$;
-- ============================================================
-- Migration: 00026_update_schema_online_tracking_and_cancellation.sql
-- ============================================================

-- Add last_seen_at to profiles
ALTER TABLE profiles ADD COLUMN last_seen_at timestamptz DEFAULT now();

-- Add min_participants to tournaments
ALTER TABLE tournaments ADD COLUMN min_participants integer DEFAULT 5;

-- Update existing tournaments if any
UPDATE tournaments SET min_participants = 5 WHERE min_participants IS NULL;

-- Function to refund entry fees when a tournament is cancelled
CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant record;
BEGIN
  FOR v_participant IN 
    SELECT user_id, entry_fee 
    FROM tournament_participants tp
    JOIN tournaments t ON t.id = tp.tournament_id
    WHERE tp.tournament_id = p_tournament_id
  LOOP
    -- Update user balance
    UPDATE profiles 
    SET available_balance = available_balance + v_participant.entry_fee
    WHERE id = v_participant.user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (v_participant.user_id, 'refund', v_participant.entry_fee, 'Refund for cancelled tournament ' || p_tournament_id, 'completed');
    
    -- Notify user
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (v_participant.user_id, 'Tournament Cancelled', 'Tournament has been cancelled due to insufficient participants. Your entry fee has been refunded.', 'system');
  END LOOP;
END;
$$;

-- Function to check and cancel tournaments starting soon with insufficient participants
CREATE OR REPLACE FUNCTION check_and_cancel_insufficient_tournaments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
BEGIN
  -- Find tournaments starting in the next 5 minutes that are still 'open' and have < min_participants
  -- Or tournaments that just started but didn't reach min_participants
  FOR v_tournament IN 
    SELECT id, name, current_players, min_participants
    FROM tournaments
    WHERE status = 'open' 
      AND start_time <= now() + interval '1 minute'
      AND current_players < min_participants
  LOOP
    -- Cancel the tournament
    UPDATE tournaments 
    SET status = 'cancelled', updated_at = now()
    WHERE id = v_tournament.id;
    
    -- Refund fees
    PERFORM refund_tournament_entry_fees(v_tournament.id);
    
    RAISE NOTICE 'Cancelled tournament % due to insufficient participants (%/%)', v_tournament.name, v_tournament.current_players, v_tournament.min_participants;
  END LOOP;
END;
$$;

-- ============================================================
-- Migration: 00027_fix_participant_count_and_add_notifications.sql
-- ============================================================


-- Create trigger function to update current_players count
CREATE OR REPLACE FUNCTION update_tournament_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment current_players when a participant joins
    UPDATE tournaments
    SET current_players = current_players + 1
    WHERE id = NEW.tournament_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement current_players when a participant leaves
    UPDATE tournaments
    SET current_players = GREATEST(0, current_players - 1)
    WHERE id = OLD.tournament_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tournament_participants
DROP TRIGGER IF EXISTS update_participant_count_trigger ON tournament_participants;
CREATE TRIGGER update_participant_count_trigger
AFTER INSERT OR DELETE ON tournament_participants
FOR EACH ROW
EXECUTE FUNCTION update_tournament_participant_count();

-- Fix existing tournaments by recalculating current_players
UPDATE tournaments t
SET current_players = (
  SELECT COUNT(*)
  FROM tournament_participants tp
  WHERE tp.tournament_id = t.id
);

-- Create function to send tournament reminders
CREATE OR REPLACE FUNCTION send_tournament_reminders()
RETURNS void AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_time_until_start interval;
BEGIN
  -- Find tournaments starting in 13-17 minutes (to catch the 15-minute window)
  FOR v_tournament IN
    SELECT id, name, start_time, game_type
    FROM tournaments
    WHERE status = 'open'
      AND start_time > NOW()
      AND start_time <= NOW() + interval '17 minutes'
      AND start_time >= NOW() + interval '13 minutes'
  LOOP
    -- Calculate exact time until start
    v_time_until_start := v_tournament.start_time - NOW();
    
    -- Send notification to all participants
    FOR v_participant IN
      SELECT user_id
      FROM tournament_participants
      WHERE tournament_id = v_tournament.id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, created_at)
      VALUES (
        v_participant.user_id,
        'tournament_reminder',
        'Tournament Starting Soon! ⏰',
        format('Your tournament "%s" starts in %s minutes. Get ready!', 
          v_tournament.name,
          ROUND(EXTRACT(EPOCH FROM v_time_until_start) / 60)
        ),
        '/tournaments/' || v_tournament.id,
        NOW()
      );
    END LOOP;
    
    RAISE NOTICE 'Sent reminders for tournament: %', v_tournament.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION send_tournament_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION send_tournament_reminders() TO service_role;

-- ============================================================
-- Migration: 00028_add_challenge_and_tournament_notifications.sql
-- ============================================================


-- Create trigger function to send notification when challenge is created
CREATE OR REPLACE FUNCTION notify_challenge_opponent()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_gamertag text;
  v_game_name text;
BEGIN
  -- Get challenger's gamertag
  SELECT gamertag INTO v_challenger_gamertag
  FROM profiles
  WHERE id = NEW.challenger_id;
  
  -- Format game name
  v_game_name := UPPER(NEW.game);
  
  -- Insert notification for opponent
  INSERT INTO notifications (user_id, type, title, message, link, created_at)
  VALUES (
    NEW.opponent_id,
    'challenge_received',
    '⚔️ New Challenge!',
    format('%s challenged you to a %s match for $%s!', 
      v_challenger_gamertag,
      v_game_name,
      NEW.stake_amount
    ),
    '/profile',
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on challenges table
DROP TRIGGER IF EXISTS notify_on_challenge_insert ON challenges;
CREATE TRIGGER notify_on_challenge_insert
AFTER INSERT ON challenges
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION notify_challenge_opponent();

-- Create function to send notifications when tournament goes live
CREATE OR REPLACE FUNCTION notify_tournament_live()
RETURNS TRIGGER AS $$
DECLARE
  v_participant RECORD;
BEGIN
  -- Only send notifications when status changes to 'live'
  IF NEW.status = 'live' AND OLD.status != 'live' THEN
    -- Send notification to all participants
    FOR v_participant IN
      SELECT user_id
      FROM tournament_participants
      WHERE tournament_id = NEW.id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, created_at)
      VALUES (
        v_participant.user_id,
        'tournament_live',
        '🔴 Tournament is LIVE!',
        format('"%s" has started! Join now and compete!', NEW.name),
        '/tournaments/' || NEW.id,
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tournaments table
DROP TRIGGER IF EXISTS notify_on_tournament_live ON tournaments;
CREATE TRIGGER notify_on_tournament_live
AFTER UPDATE OF status ON tournaments
FOR EACH ROW
EXECUTE FUNCTION notify_tournament_live();

-- ============================================================
-- Migration: 00029_add_standby_players_and_bracket_fixes.sql
-- ============================================================


-- Add is_standby to tournament_participants
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS is_standby boolean DEFAULT false;

-- Add check-in deadline to tournament_participants (to track per-player check-in)
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Function to handle standby replacement and match progression
CREATE OR REPLACE FUNCTION handle_match_check_in_timeout(p_match_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_result record;
  v_standby_player record;
  v_tournament record;
  v_p1_ready boolean;
  v_p2_ready boolean;
  v_winner_id uuid;
BEGIN
  -- Get match result details
  SELECT * INTO v_match_result FROM match_results WHERE id = p_match_result_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  -- If already confirmed or both ready, do nothing
  IF v_match_result.status = 'confirmed' OR (v_match_result.player1_checked_in AND v_match_result.player2_checked_in) THEN
    RETURN;
  END IF;

  v_p1_ready := v_match_result.player1_checked_in;
  v_p2_ready := v_match_result.player2_checked_in;

  -- Try to replace non-ready players with standby players
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = v_match_result.tournament_id;

  -- Replace Player 1 if not ready
  IF NOT v_p1_ready THEN
    SELECT * INTO v_standby_player 
    FROM tournament_participants 
    WHERE tournament_id = v_match_result.tournament_id 
      AND is_standby = true 
      AND eliminated = false
    ORDER BY created_at ASC
    LIMIT 1;

    IF FOUND THEN
      -- Replace Player 1
      UPDATE match_results 
      SET player1_id = v_standby_player.user_id,
          player1_checked_in = false,
          check_in_deadline = now() + interval '5 minutes'
      WHERE id = p_match_result_id;
      
      -- Mark standby player as no longer standby
      UPDATE tournament_participants 
      SET is_standby = false 
      WHERE id = v_standby_player.id;
      
      -- Recalculate p1_ready for subsequent logic
      v_p1_ready := false; 
      
      -- Notify new player
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_standby_player.user_id, 'You are in!', 'A slot opened up in the tournament. Check in now to play!', 'tournament', '/tournaments/' || v_match_result.tournament_id);
    END IF;
  END IF;

  -- Replace Player 2 if not ready
  IF NOT v_p2_ready THEN
    SELECT * INTO v_standby_player 
    FROM tournament_participants 
    WHERE tournament_id = v_match_result.tournament_id 
      AND is_standby = true 
      AND eliminated = false
    ORDER BY created_at ASC
    LIMIT 1;

    IF FOUND THEN
      -- Replace Player 2
      UPDATE match_results 
      SET player2_id = v_standby_player.user_id,
          player2_checked_in = false,
          check_in_deadline = now() + interval '5 minutes'
      WHERE id = p_match_result_id;
      
      -- Mark standby player as no longer standby
      UPDATE tournament_participants 
      SET is_standby = false 
      WHERE id = v_standby_player.id;
      
      -- Recalculate p2_ready
      v_p2_ready := false;

      -- Notify new player
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_standby_player.user_id, 'You are in!', 'A slot opened up in the tournament. Check in now to play!', 'tournament', '/tournaments/' || v_match_result.tournament_id);
    END IF;
  END IF;

  -- Re-fetch match result after possible replacements
  SELECT * INTO v_match_result FROM match_results WHERE id = p_match_result_id;
  
  -- If still someone not ready and no more standby players, handle forfeit
  IF NOT v_match_result.player1_checked_in OR NOT v_match_result.player2_checked_in THEN
    -- If no more replacements possible, we must decide a winner or double DQ
    IF v_match_result.player1_checked_in THEN
      v_winner_id := v_match_result.player1_id;
    ELSIF v_match_result.player2_checked_in THEN
      v_winner_id := v_match_result.player2_id;
    ELSE
      v_winner_id := NULL; -- Double DQ
    END IF;

    UPDATE match_results 
    SET status = 'confirmed',
        winner_id = v_winner_id,
        admin_override = true,
        updated_at = now()
    WHERE id = p_match_result_id;
    
    -- Mark non-ready players as eliminated
    IF NOT v_match_result.player1_checked_in THEN
       UPDATE tournament_participants SET eliminated = true WHERE tournament_id = v_match_result.tournament_id AND user_id = v_match_result.player1_id;
    END IF;
    IF NOT v_match_result.player2_checked_in THEN
       UPDATE tournament_participants SET eliminated = true WHERE tournament_id = v_match_result.tournament_id AND user_id = v_match_result.player2_id;
    END IF;
  END IF;
END;
$$;

-- Create Round 1 matches when tournament starts
CREATE OR REPLACE FUNCTION initialize_tournament_bracket()
RETURNS trigger AS $$
DECLARE
  v_participants_count integer;
  v_num_matches integer;
  v_i integer;
  v_p1 record;
  v_p2 record;
  v_check_in_deadline timestamptz;
BEGIN
  -- Only run when status changes to 'active'
  IF NEW.status = 'active' AND OLD.status = 'open' THEN
    -- Get confirmed participants (not standby)
    -- If we have more than max_players, some remain standby
    -- For now, let's just take the first max_players
    
    -- Assign seeds if not assigned
    WITH seeded_participants AS (
      SELECT id, row_number() OVER (ORDER BY created_at ASC) as seed
      FROM tournament_participants
      WHERE tournament_id = NEW.id
      LIMIT NEW.max_players
    )
    UPDATE tournament_participants tp
    SET bracket_seed = sp.seed,
        is_standby = false
    FROM seeded_participants sp
    WHERE tp.id = sp.id;

    -- Mark others as standby
    UPDATE tournament_participants
    SET is_standby = true
    WHERE tournament_id = NEW.id AND bracket_seed IS NULL;

    -- Create Round 1 Matches
    -- Standard single elimination bracket logic
    v_participants_count := NEW.max_players;
    v_num_matches := v_participants_count / 2;
    v_check_in_deadline := now() + interval '5 minutes';

    FOR v_i IN 0..(v_num_matches - 1) LOOP
      -- Get players for this match (seed i+1 and max-i)
      SELECT user_id INTO v_p1 FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed = v_i + 1;
      SELECT user_id INTO v_p2 FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed = v_participants_count - v_i;

      IF v_p1.user_id IS NOT NULL AND v_p2.user_id IS NOT NULL THEN
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          player1_id,
          player2_id,
          check_in_deadline,
          status
        ) VALUES (
          NEW.id,
          'r1-m' || v_i,
          1,
          v_p1.user_id,
          v_p2.user_id,
          v_check_in_deadline,
          'pending'
        ) ON CONFLICT (tournament_id, match_id) DO UPDATE SET
          player1_id = EXCLUDED.player1_id,
          player2_id = EXCLUDED.player2_id,
          check_in_deadline = EXCLUDED.check_in_deadline;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_initialize_bracket ON tournaments;
CREATE TRIGGER trigger_initialize_bracket
  AFTER UPDATE OF status ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION initialize_tournament_bracket();

-- ============================================================
-- Migration: 00030_refine_bracket_initialization.sql
-- ============================================================


CREATE OR REPLACE FUNCTION initialize_tournament_bracket()
RETURNS trigger AS $$
DECLARE
  v_confirmed_count integer;
  v_total_needed integer;
  v_i integer;
  v_p1_id uuid;
  v_p2_id uuid;
  v_check_in_deadline timestamptz;
  v_match_id text;
BEGIN
  -- Only run when status changes to 'active'
  IF NEW.status = 'active' AND OLD.status = 'open' THEN
    -- 1. Assign seeds to confirmed players
    WITH seeded_confirmed AS (
      SELECT id, row_number() OVER (ORDER BY created_at ASC) as seed
      FROM tournament_participants
      WHERE tournament_id = NEW.id AND is_standby = false
      LIMIT NEW.max_players
    )
    UPDATE tournament_participants tp
    SET bracket_seed = sc.seed
    FROM seeded_confirmed sc
    WHERE tp.id = sc.id;

    -- 2. Count how many confirmed players we have
    SELECT count(*) INTO v_confirmed_count FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed IS NOT NULL;

    -- 3. If we have fewer than max_players, try to pull from standby
    IF v_confirmed_count < NEW.max_players THEN
      WITH seeded_standby AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) + v_confirmed_count as seed
        FROM tournament_participants
        WHERE tournament_id = NEW.id AND is_standby = true
        LIMIT (NEW.max_players - v_confirmed_count)
      )
      UPDATE tournament_participants tp
      SET bracket_seed = ss.seed,
          is_standby = false
      FROM seeded_standby ss
      WHERE tp.id = ss.id;
    END IF;

    -- 4. Re-calculate count
    SELECT count(*) INTO v_confirmed_count FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed IS NOT NULL;

    -- 5. Create Round 1 Matches
    v_total_needed := NEW.max_players;
    v_check_in_deadline := now() + interval '5 minutes';

    FOR v_i IN 0..(v_total_needed / 2 - 1) LOOP
      v_match_id := 'r1-m' || v_i;
      
      -- Get player 1 (seed v_i + 1)
      SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed = v_i + 1;
      -- Get player 2 (seed v_total_needed - v_i)
      SELECT user_id INTO v_p2_id FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed = v_total_needed - v_i;

      IF v_p1_id IS NOT NULL AND v_p2_id IS NOT NULL THEN
        -- Normal match
        INSERT INTO match_results (
          tournament_id, match_id, round, player1_id, player2_id, check_in_deadline, status
        ) VALUES (
          NEW.id, v_match_id, 1, v_p1_id, v_p2_id, v_check_in_deadline, 'pending'
        ) ON CONFLICT (tournament_id, match_id) DO UPDATE SET
          player1_id = EXCLUDED.player1_id,
          player2_id = EXCLUDED.player2_id,
          check_in_deadline = EXCLUDED.check_in_deadline;
      ELSIF v_p1_id IS NOT NULL THEN
        -- Bye for player 1
        INSERT INTO match_results (
          tournament_id, match_id, round, player1_id, winner_id, status, admin_override
        ) VALUES (
          NEW.id, v_match_id, 1, v_p1_id, v_p1_id, 'confirmed', true
        ) ON CONFLICT (tournament_id, match_id) DO UPDATE SET
          player1_id = EXCLUDED.player1_id,
          winner_id = EXCLUDED.winner_id,
          status = EXCLUDED.status;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Migration: 00031_fix_bracket_loop_range.sql
-- ============================================================


CREATE OR REPLACE FUNCTION initialize_tournament_bracket()
RETURNS trigger AS $$
DECLARE
  v_confirmed_count integer;
  v_total_needed integer;
  v_i integer;
  v_p1_id uuid;
  v_p2_id uuid;
  v_check_in_deadline timestamptz;
  v_match_id text;
BEGIN
  -- Only run when status changes to 'active'
  IF NEW.status = 'active' AND OLD.status = 'open' THEN
    -- 1. Assign seeds to confirmed players
    WITH seeded_confirmed AS (
      SELECT id, row_number() OVER (ORDER BY created_at ASC) as seed
      FROM tournament_participants
      WHERE tournament_id = NEW.id AND is_standby = false
      LIMIT NEW.max_players
    )
    UPDATE tournament_participants tp
    SET bracket_seed = sc.seed
    FROM seeded_confirmed sc
    WHERE tp.id = sc.id;

    -- 2. Count how many confirmed players we have
    SELECT count(*) INTO v_confirmed_count FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed IS NOT NULL;

    -- 3. If we have fewer than max_players, try to pull from standby
    IF v_confirmed_count < NEW.max_players THEN
      WITH seeded_standby AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) + v_confirmed_count as seed
        FROM tournament_participants
        WHERE tournament_id = NEW.id AND is_standby = true
        LIMIT (NEW.max_players - v_confirmed_count)
      )
      UPDATE tournament_participants tp
      SET bracket_seed = ss.seed,
          is_standby = false
      FROM seeded_standby ss
      WHERE tp.id = ss.id;
    END IF;

    -- 4. Re-calculate count
    SELECT count(*) INTO v_confirmed_count FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed IS NOT NULL;

    -- 5. Create Round 1 Matches
    v_total_needed := NEW.max_players;
    v_check_in_deadline := now() + interval '5 minutes';

    FOR v_i IN 0..( (v_total_needed + 1) / 2 - 1 ) LOOP
      v_match_id := 'r1-m' || v_i;
      
      -- Get player 1 (seed v_i + 1)
      SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed = v_i + 1;
      -- Get player 2 (seed v_total_needed - v_i)
      SELECT user_id INTO v_p2_id FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed = v_total_needed - v_i;

      IF v_p1_id IS NOT NULL AND v_p2_id IS NOT NULL AND v_p1_id != v_p2_id THEN
        -- Normal match
        INSERT INTO match_results (
          tournament_id, match_id, round, player1_id, player2_id, check_in_deadline, status
        ) VALUES (
          NEW.id, v_match_id, 1, v_p1_id, v_p2_id, v_check_in_deadline, 'pending'
        ) ON CONFLICT (tournament_id, match_id) DO UPDATE SET
          player1_id = EXCLUDED.player1_id,
          player2_id = EXCLUDED.player2_id,
          check_in_deadline = EXCLUDED.check_in_deadline;
      ELSIF v_p1_id IS NOT NULL THEN
        -- Bye for player 1
        INSERT INTO match_results (
          tournament_id, match_id, round, player1_id, winner_id, status, admin_override
        ) VALUES (
          NEW.id, v_match_id, 1, v_p1_id, v_p1_id, 'confirmed', true
        ) ON CONFLICT (tournament_id, match_id) DO UPDATE SET
          player1_id = EXCLUDED.player1_id,
          winner_id = EXCLUDED.winner_id,
          status = EXCLUDED.status;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Migration: 00032_set_match_results_replica_identity_full.sql
-- ============================================================

ALTER TABLE match_results REPLICA IDENTITY FULL;
-- ============================================================
-- Migration: 00033_enable_realtime_for_tournaments_and_participants.sql
-- ============================================================

-- Enable Realtime for tournaments and tournament_participants tables
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_participants;

-- ============================================================
-- Migration: 00034_add_team_id_to_participants.sql
-- ============================================================

ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES tournament_teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tournament_participants_team_id ON tournament_participants(team_id);
-- ============================================================
-- Migration: 00035_add_general_teams_support.sql
-- ============================================================

-- General teams (not specific to a tournament)
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  captain_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- 'captain', 'member'
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Captains can manage their teams" ON teams FOR ALL USING (auth.uid() = captain_id);

CREATE POLICY "Anyone can view team members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Captains can manage members" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM teams WHERE id = team_id AND captain_id = auth.uid())
);
CREATE POLICY "Users can leave teams" ON team_members FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Migration: 00036_make_gamertag_required.sql
-- ============================================================

-- Make gamertag NOT NULL with a default value for existing users
-- First, update any NULL gamertags to use a generated value
UPDATE profiles 
SET gamertag = 'Player' || SUBSTRING(id::text, 1, 8)
WHERE gamertag IS NULL;

-- Now make the column NOT NULL
ALTER TABLE profiles 
ALTER COLUMN gamertag SET NOT NULL;

-- Add a check constraint to ensure gamertag is not empty
ALTER TABLE profiles 
ADD CONSTRAINT gamertag_not_empty CHECK (length(trim(gamertag)) > 0);

-- ============================================================
-- Migration: 00037_implement_arena_currency_system.sql
-- ============================================================

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

-- ============================================================
-- Migration: 00038_arena_currency_prize_distribution.sql
-- ============================================================

-- Function to distribute Arena Currency prizes when tournament completes
CREATE OR REPLACE FUNCTION distribute_arena_prizes(
  p_tournament_id uuid,
  p_winner_user_id uuid,
  p_prize_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_platform_fee numeric;
  v_net_prize numeric;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  -- Calculate platform fee (10%)
  v_platform_fee := p_prize_amount * 0.10;
  v_net_prize := p_prize_amount - v_platform_fee;
  
  -- Add Arena Currency to winner
  UPDATE profiles
  SET arena_currency = COALESCE(arena_currency, 0) + v_net_prize
  WHERE id = p_winner_user_id;
  
  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;
  
  -- If tournament had entry fee, refund creator's $10 deposit
  IF v_tournament.entry_fee > 0 THEN
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + 10
    WHERE id = v_tournament.created_by;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION distribute_arena_prizes TO authenticated;

-- ============================================================
-- Migration: 00039_add_username_to_profiles.sql
-- ============================================================

-- Add username column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;

-- Update the handle_new_user function to include username
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Insert a profile synced with fields collected at signup
  INSERT INTO public.profiles (id, email, username, gamertag, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'gamertag', split_part(NEW.email, '@', 1)),
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  )
  ON CONFLICT (id) DO UPDATE
  SET email = COALESCE(EXCLUDED.email, profiles.email),
      username = COALESCE(profiles.username, EXCLUDED.username),
      gamertag = COALESCE(profiles.gamertag, EXCLUDED.gamertag);
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- Migration: 00040_automated_refund_notifications.sql
-- ============================================================

-- 1. Update refund_tournament_entry_fees to use arena_currency and remove manual notification
CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void AS $$
DECLARE
  v_participant record;
BEGIN
  FOR v_participant IN 
    SELECT user_id, entry_fee 
    FROM tournament_participants tp
    JOIN tournaments t ON t.id = tp.tournament_id
    WHERE tp.tournament_id = p_tournament_id
  LOOP
    -- Update user balance
    UPDATE profiles 
    SET arena_currency = arena_currency + v_participant.entry_fee,
        available_balance = available_balance + v_participant.entry_fee
    WHERE id = v_participant.user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (v_participant.user_id, 'refund', v_participant.entry_fee, 'Refund for cancelled tournament: ' || p_tournament_id, 'completed', p_tournament_id);
    
    -- Notification will be handled by the transactions trigger
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Handle Challenge Refunds via trigger
CREATE OR REPLACE FUNCTION handle_challenge_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- If challenge is declined or expired, refund the challenger
  IF (OLD.status = 'pending' AND (NEW.status = 'declined' OR NEW.status = 'expired')) THEN
    -- Update user balance
    UPDATE profiles
    SET arena_currency = arena_currency + OLD.stake_amount,
        available_balance = available_balance + OLD.stake_amount
    WHERE id = OLD.challenger_id;

    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status, metadata)
    VALUES (
      OLD.challenger_id, 
      'refund', 
      OLD.stake_amount, 
      CASE 
        WHEN NEW.status = 'declined' THEN 'Challenge declined by opponent'
        ELSE 'Challenge expired without response'
      END,
      'completed',
      jsonb_build_object('challenge_id', OLD.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists and drop if it does
DROP TRIGGER IF EXISTS challenge_refund_trigger ON challenges;

CREATE TRIGGER challenge_refund_trigger
AFTER UPDATE ON challenges
FOR EACH ROW
EXECUTE FUNCTION handle_challenge_refund();

-- 3. Automated Notification on any refund transaction
CREATE OR REPLACE FUNCTION create_refund_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.type = 'refund') THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'Refund Issued',
      'A refund of A$' || NEW.amount || ' has been processed: ' || NEW.description,
      'payment'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists and drop if it does
DROP TRIGGER IF EXISTS refund_notification_trigger ON transactions;

CREATE TRIGGER refund_notification_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION create_refund_notification();

-- ============================================================
-- Migration: 00041_automated_refund_notifications_v2.sql
-- ============================================================

-- Update trigger to include a link to the wallet
CREATE OR REPLACE FUNCTION create_refund_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.type = 'refund') THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Refund Issued',
      'A refund of A$' || NEW.amount || ' has been processed: ' || NEW.description,
      'payment',
      '/wallet'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Migration: 00042_add_amount_paid_to_participants.sql
-- ============================================================

ALTER TABLE tournament_participants ADD COLUMN amount_paid numeric DEFAULT 0;

-- Update existing participants to have the current entry fee of their tournament
UPDATE tournament_participants tp
SET amount_paid = t.entry_fee
FROM tournaments t
WHERE tp.tournament_id = t.id;

-- ============================================================
-- Migration: 00043_update_refund_function.sql
-- ============================================================

CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant record;
BEGIN
  FOR v_participant IN 
    SELECT user_id, amount_paid 
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
      AND tp.amount_paid > 0
      -- Check if we already issued a refund for this tournament to this user
      AND NOT EXISTS (
        SELECT 1 FROM transactions 
        WHERE user_id = tp.user_id 
          AND tournament_id = p_tournament_id 
          AND type = 'refund'
      )
  LOOP
    -- Update user balance
    UPDATE profiles 
    SET arena_currency = COALESCE(arena_currency, 0) + v_participant.amount_paid,
        available_balance = COALESCE(available_balance, 0) + v_participant.amount_paid
    WHERE id = v_participant.user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_participant.user_id, 
      'refund', 
      v_participant.amount_paid, 
      'Refund for cancelled tournament: ' || p_tournament_id, 
      'completed', 
      p_tournament_id
    );
  END LOOP;
END;
$$;

-- ============================================================
-- Migration: 00044_update_refund_function_with_creator.sql
-- ============================================================

CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant record;
  v_tournament record;
  v_creator_refund numeric;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Refund Participants
  FOR v_participant IN 
    SELECT user_id, amount_paid 
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
      AND tp.amount_paid > 0
      AND NOT EXISTS (
        SELECT 1 FROM transactions 
        WHERE user_id = tp.user_id 
          AND tournament_id = p_tournament_id 
          AND type = 'refund'
          AND description NOT LIKE 'Creator refund%'
      )
  LOOP
    -- Update user balance
    UPDATE profiles 
    SET arena_currency = COALESCE(arena_currency, 0) + v_participant.amount_paid,
        available_balance = COALESCE(available_balance, 0) + v_participant.amount_paid
    WHERE id = v_participant.user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_participant.user_id, 
      'refund', 
      v_participant.amount_paid, 
      'Refund for cancelled tournament: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );
  END LOOP;

  -- 2. Refund Creator Deposit/Contribution
  -- Calculate what the creator paid
  IF v_tournament.entry_fee > 0 THEN
    v_creator_refund := 10; -- The $10 deposit
  ELSE
    v_creator_refund := v_tournament.creator_contribution; -- The prize pool they funded
  END IF;

  IF v_creator_refund > 0 THEN
    -- Check if creator already got a refund for this tournament
    IF NOT EXISTS (
      SELECT 1 FROM transactions 
      WHERE user_id = v_tournament.created_by 
        AND tournament_id = p_tournament_id 
        AND type = 'refund'
        AND description LIKE 'Creator refund%'
    ) THEN
      UPDATE profiles 
      SET arena_currency = COALESCE(arena_currency, 0) + v_creator_refund,
          available_balance = COALESCE(available_balance, 0) + v_creator_refund
      WHERE id = v_tournament.created_by;

      INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
      VALUES (
        v_tournament.created_by, 
        'refund', 
        v_creator_refund, 
        'Creator refund for cancelled tournament: ' || v_tournament.name, 
        'completed', 
        p_tournament_id
      );
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- Migration: 00045_add_bracket_scheduling_fields.sql
-- ============================================================

-- Add bracket_generated flag to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS bracket_generated boolean DEFAULT false;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS bracket_generated_at timestamptz;

-- Add check-in tracking fields to match_results
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS check_in_started_at timestamptz;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS replacement_count integer DEFAULT 0;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS player1_ready_at timestamptz;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS player2_ready_at timestamptz;

-- Add spectator_assigned flag to track if participant was pulled from standby
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS spectator_assigned boolean DEFAULT false;

-- ============================================================
-- Migration: 00046_create_bracket_generation_function.sql
-- ============================================================

-- Function to generate brackets 15 minutes before tournament start
CREATE OR REPLACE FUNCTION generate_tournament_brackets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_confirmed_count integer;
  v_total_needed integer;
  v_i integer;
  v_p1_id uuid;
  v_p2_id uuid;
  v_t1_id uuid;
  v_t2_id uuid;
  v_check_in_deadline timestamptz;
  v_match_id text;
  v_p1_gamertag text;
  v_p2_gamertag text;
BEGIN
  -- Find tournaments that start in 15 minutes and haven't generated brackets yet
  FOR v_tournament IN 
    SELECT * FROM tournaments
    WHERE status = 'open'
      AND bracket_generated = false
      AND start_time <= now() + interval '16 minutes'
      AND start_time > now() + interval '14 minutes'
      AND current_players >= min_participants
  LOOP
    -- Mark bracket as generated
    UPDATE tournaments 
    SET bracket_generated = true, bracket_generated_at = now()
    WHERE id = v_tournament.id;

    IF v_tournament.team_size > 1 THEN
      -- Team-based tournament logic
      SELECT count(*) INTO v_confirmed_count FROM tournament_teams WHERE tournament_id = v_tournament.id;
      v_total_needed := v_tournament.max_players / v_tournament.team_size;
      v_check_in_deadline := v_tournament.start_time + interval '5 minutes';

      FOR v_i IN 0..(v_total_needed / 2 - 1) LOOP
        v_match_id := 'r1-m' || v_i;
        
        SELECT id, captain_id INTO v_t1_id, v_p1_id FROM (
          SELECT id, captain_id, row_number() OVER (ORDER BY created_at ASC) as seed 
          FROM tournament_teams WHERE tournament_id = v_tournament.id
        ) s WHERE seed = v_i + 1;
        
        SELECT id, captain_id INTO v_t2_id, v_p2_id FROM (
          SELECT id, captain_id, row_number() OVER (ORDER BY created_at ASC) as seed 
          FROM tournament_teams WHERE tournament_id = v_tournament.id
        ) s WHERE seed = v_total_needed - v_i;

        IF v_t1_id IS NOT NULL AND v_t2_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, player2_id, team1_id, team2_id, 
            check_in_deadline, check_in_started_at, status
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_p2_id, v_t1_id, v_t2_id, 
            v_check_in_deadline, v_tournament.start_time, 'pending'
          );

          -- Send pairing notifications to both captains
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES 
            (v_p1_id, 'Match Pairing Ready', 'Your match pairing for ' || v_tournament.name || ' is ready. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id),
            (v_p2_id, 'Match Pairing Ready', 'Your match pairing for ' || v_tournament.name || ' is ready. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id);
        ELSIF v_t1_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, team1_id, winner_id, status, admin_override
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_t1_id, v_p1_id, 'confirmed', true
          );
        END IF;
      END LOOP;

    ELSE
      -- Individual tournament logic
      WITH seeded_confirmed AS (
        SELECT id, user_id, gamertag, row_number() OVER (ORDER BY created_at ASC) as seed
        FROM tournament_participants
        WHERE tournament_id = v_tournament.id AND is_standby = false
        LIMIT v_tournament.max_players
      )
      UPDATE tournament_participants tp
      SET bracket_seed = sc.seed
      FROM seeded_confirmed sc
      WHERE tp.id = sc.id;

      SELECT count(*) INTO v_confirmed_count FROM tournament_participants 
      WHERE tournament_id = v_tournament.id AND bracket_seed IS NOT NULL;

      v_total_needed := v_tournament.max_players;
      v_check_in_deadline := v_tournament.start_time + interval '5 minutes';

      FOR v_i IN 0..(v_total_needed / 2 - 1) LOOP
        v_match_id := 'r1-m' || v_i;
        
        SELECT user_id, gamertag INTO v_p1_id, v_p1_gamertag 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND bracket_seed = v_i + 1;
        
        SELECT user_id, gamertag INTO v_p2_id, v_p2_gamertag 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND bracket_seed = v_total_needed - v_i;

        IF v_p1_id IS NOT NULL AND v_p2_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, player2_id, 
            check_in_deadline, check_in_started_at, status
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_p2_id, 
            v_check_in_deadline, v_tournament.start_time, 'pending'
          );

          -- Send pairing notifications
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES 
            (v_p1_id, 'Match Pairing Ready', 'You will face ' || COALESCE(v_p2_gamertag, 'opponent') || ' in ' || v_tournament.name || '. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id),
            (v_p2_id, 'Match Pairing Ready', 'You will face ' || COALESCE(v_p1_gamertag, 'opponent') || ' in ' || v_tournament.name || '. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id);
        ELSIF v_p1_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, winner_id, status, admin_override
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_p1_id, 'confirmed', true
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- Migration: 00047_create_check_in_enforcement_function.sql
-- ============================================================

-- Function to handle check-in timeouts and spectator replacement
CREATE OR REPLACE FUNCTION enforce_check_in_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match record;
  v_spectator record;
  v_new_deadline timestamptz;
  v_tournament record;
BEGIN
  -- Find matches where check-in deadline has passed and not both players checked in
  FOR v_match IN 
    SELECT mr.*, t.name as tournament_name, t.team_size
    FROM match_results mr
    JOIN tournaments t ON t.id = mr.tournament_id
    WHERE mr.status = 'pending'
      AND mr.check_in_deadline < now()
      AND NOT (COALESCE(mr.player1_checked_in, false) AND COALESCE(mr.player2_checked_in, false))
      AND mr.replacement_count < 3  -- Limit replacements to prevent infinite loops
  LOOP
    SELECT * INTO v_tournament FROM tournaments WHERE id = v_match.tournament_id;

    -- Case 1: Both players didn't check in
    IF NOT COALESCE(v_match.player1_checked_in, false) AND NOT COALESCE(v_match.player2_checked_in, false) THEN
      -- Try to find 2 spectators
      IF v_tournament.team_size > 1 THEN
        -- Team tournament - need 2 teams from standby
        DECLARE
          v_team1 record;
          v_team2 record;
        BEGIN
          SELECT tt.id, tt.captain_id INTO v_team1
          FROM tournament_teams tt
          WHERE tt.tournament_id = v_match.tournament_id
            AND NOT EXISTS (
              SELECT 1 FROM match_results mr2 
              WHERE mr2.tournament_id = v_match.tournament_id 
                AND (mr2.team1_id = tt.id OR mr2.team2_id = tt.id)
                AND mr2.status != 'confirmed'
            )
          LIMIT 1;

          SELECT tt.id, tt.captain_id INTO v_team2
          FROM tournament_teams tt
          WHERE tt.tournament_id = v_match.tournament_id
            AND tt.id != v_team1.id
            AND NOT EXISTS (
              SELECT 1 FROM match_results mr2 
              WHERE mr2.tournament_id = v_match.tournament_id 
                AND (mr2.team1_id = tt.id OR mr2.team2_id = tt.id)
                AND mr2.status != 'confirmed'
            )
          LIMIT 1;

          IF v_team1.id IS NOT NULL AND v_team2.id IS NOT NULL THEN
            v_new_deadline := now() + interval '5 minutes';
            UPDATE match_results
            SET player1_id = v_team1.captain_id,
                player2_id = v_team2.captain_id,
                team1_id = v_team1.id,
                team2_id = v_team2.id,
                player1_checked_in = false,
                player2_checked_in = false,
                check_in_deadline = v_new_deadline,
                replacement_count = v_match.replacement_count + 1
            WHERE id = v_match.id;

            -- Notify new teams
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES 
              (v_team1.captain_id, 'Match Assignment', 'Your team has been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id),
              (v_team2.captain_id, 'Match Assignment', 'Your team has been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
          ELSE
            -- Not enough teams, mark match as no contest
            UPDATE match_results
            SET status = 'confirmed',
                winner_id = NULL,
                admin_override = true
            WHERE id = v_match.id;
          END IF;
        END;
      ELSE
        -- Individual tournament - need 2 spectators
        DECLARE
          v_spec1 record;
          v_spec2 record;
        BEGIN
          SELECT tp.user_id, tp.gamertag, tp.id as participant_id INTO v_spec1
          FROM tournament_participants tp
          WHERE tp.tournament_id = v_match.tournament_id
            AND tp.is_standby = true
            AND tp.spectator_assigned = false
          ORDER BY tp.created_at ASC
          LIMIT 1;

          SELECT tp.user_id, tp.gamertag, tp.id as participant_id INTO v_spec2
          FROM tournament_participants tp
          WHERE tp.tournament_id = v_match.tournament_id
            AND tp.is_standby = true
            AND tp.spectator_assigned = false
            AND tp.user_id != v_spec1.user_id
          ORDER BY tp.created_at ASC
          LIMIT 1;

          IF v_spec1.user_id IS NOT NULL AND v_spec2.user_id IS NOT NULL THEN
            v_new_deadline := now() + interval '5 minutes';
            UPDATE match_results
            SET player1_id = v_spec1.user_id,
                player2_id = v_spec2.user_id,
                player1_checked_in = false,
                player2_checked_in = false,
                check_in_deadline = v_new_deadline,
                replacement_count = v_match.replacement_count + 1
            WHERE id = v_match.id;

            UPDATE tournament_participants
            SET spectator_assigned = true
            WHERE id IN (v_spec1.participant_id, v_spec2.participant_id);

            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES 
              (v_spec1.user_id, 'Match Assignment', 'You have been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id),
              (v_spec2.user_id, 'Match Assignment', 'You have been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
          ELSE
            -- Not enough spectators, mark as no contest
            UPDATE match_results
            SET status = 'confirmed',
                winner_id = NULL,
                admin_override = true
            WHERE id = v_match.id;
          END IF;
        END;
      END IF;

    -- Case 2: Only player1 checked in
    ELSIF COALESCE(v_match.player1_checked_in, false) AND NOT COALESCE(v_match.player2_checked_in, false) THEN
      IF v_tournament.team_size > 1 THEN
        -- Find replacement team
        DECLARE
          v_new_team record;
        BEGIN
          SELECT tt.id, tt.captain_id INTO v_new_team
          FROM tournament_teams tt
          WHERE tt.tournament_id = v_match.tournament_id
            AND tt.id != v_match.team1_id
            AND NOT EXISTS (
              SELECT 1 FROM match_results mr2 
              WHERE mr2.tournament_id = v_match.tournament_id 
                AND (mr2.team1_id = tt.id OR mr2.team2_id = tt.id)
                AND mr2.status != 'confirmed'
            )
          LIMIT 1;

          IF v_new_team.id IS NOT NULL THEN
            v_new_deadline := now() + interval '5 minutes';
            UPDATE match_results
            SET player2_id = v_new_team.captain_id,
                team2_id = v_new_team.id,
                player2_checked_in = false,
                check_in_deadline = v_new_deadline,
                replacement_count = v_match.replacement_count + 1
            WHERE id = v_match.id;

            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (v_new_team.captain_id, 'Match Assignment', 'Your team has been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
          ELSE
            -- No replacement, player1 advances
            UPDATE match_results
            SET status = 'confirmed',
                winner_id = v_match.player1_id,
                admin_override = true
            WHERE id = v_match.id;
          END IF;
        END;
      ELSE
        -- Find replacement player
        SELECT tp.user_id, tp.gamertag, tp.id as participant_id INTO v_spectator
        FROM tournament_participants tp
        WHERE tp.tournament_id = v_match.tournament_id
          AND tp.is_standby = true
          AND tp.spectator_assigned = false
        ORDER BY tp.created_at ASC
        LIMIT 1;

        IF v_spectator.user_id IS NOT NULL THEN
          v_new_deadline := now() + interval '5 minutes';
          UPDATE match_results
          SET player2_id = v_spectator.user_id,
              player2_checked_in = false,
              check_in_deadline = v_new_deadline,
              replacement_count = v_match.replacement_count + 1
          WHERE id = v_match.id;

          UPDATE tournament_participants
          SET spectator_assigned = true
          WHERE id = v_spectator.participant_id;

          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (v_spectator.user_id, 'Match Assignment', 'You have been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
        ELSE
          -- No spectator, player1 advances
          UPDATE match_results
          SET status = 'confirmed',
              winner_id = v_match.player1_id,
              admin_override = true
          WHERE id = v_match.id;
        END IF;
      END IF;

    -- Case 3: Only player2 checked in
    ELSIF NOT COALESCE(v_match.player1_checked_in, false) AND COALESCE(v_match.player2_checked_in, false) THEN
      IF v_tournament.team_size > 1 THEN
        DECLARE
          v_new_team record;
        BEGIN
          SELECT tt.id, tt.captain_id INTO v_new_team
          FROM tournament_teams tt
          WHERE tt.tournament_id = v_match.tournament_id
            AND tt.id != v_match.team2_id
            AND NOT EXISTS (
              SELECT 1 FROM match_results mr2 
              WHERE mr2.tournament_id = v_match.tournament_id 
                AND (mr2.team1_id = tt.id OR mr2.team2_id = tt.id)
                AND mr2.status != 'confirmed'
            )
          LIMIT 1;

          IF v_new_team.id IS NOT NULL THEN
            v_new_deadline := now() + interval '5 minutes';
            UPDATE match_results
            SET player1_id = v_new_team.captain_id,
                team1_id = v_new_team.id,
                player1_checked_in = false,
                check_in_deadline = v_new_deadline,
                replacement_count = v_match.replacement_count + 1
            WHERE id = v_match.id;

            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (v_new_team.captain_id, 'Match Assignment', 'Your team has been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
          ELSE
            UPDATE match_results
            SET status = 'confirmed',
                winner_id = v_match.player2_id,
                admin_override = true
            WHERE id = v_match.id;
          END IF;
        END;
      ELSE
        SELECT tp.user_id, tp.gamertag, tp.id as participant_id INTO v_spectator
        FROM tournament_participants tp
        WHERE tp.tournament_id = v_match.tournament_id
          AND tp.is_standby = true
          AND tp.spectator_assigned = false
        ORDER BY tp.created_at ASC
        LIMIT 1;

        IF v_spectator.user_id IS NOT NULL THEN
          v_new_deadline := now() + interval '5 minutes';
          UPDATE match_results
          SET player1_id = v_spectator.user_id,
              player1_checked_in = false,
              check_in_deadline = v_new_deadline,
              replacement_count = v_match.replacement_count + 1
          WHERE id = v_match.id;

          UPDATE tournament_participants
          SET spectator_assigned = true
          WHERE id = v_spectator.participant_id;

          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (v_spectator.user_id, 'Match Assignment', 'You have been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
        ELSE
          UPDATE match_results
          SET status = 'confirmed',
              winner_id = v_match.player2_id,
              admin_override = true
          WHERE id = v_match.id;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- Migration: 00048_update_tournament_status_check.sql
-- ============================================================

-- Update the tournament status check function to call bracket generation and check-in enforcement
CREATE OR REPLACE FUNCTION check_and_update_tournament_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Generate brackets for tournaments starting in 15 minutes
  PERFORM generate_tournament_brackets();

  -- 2. Start tournaments that have generated brackets and reached start time
  UPDATE tournaments
  SET status = 'active'
  WHERE status = 'open'
    AND bracket_generated = true
    AND start_time <= now()
    AND current_players >= min_participants;

  -- 3. Enforce check-in deadlines
  PERFORM enforce_check_in_deadlines();

  -- 4. Cancel tournaments that didn't meet minimum participants
  UPDATE tournaments
  SET status = 'cancelled'
  WHERE status = 'open'
    AND start_time <= now()
    AND current_players < min_participants;

  -- Refund cancelled tournaments
  PERFORM refund_tournament_entry_fees(id)
  FROM tournaments
  WHERE status = 'cancelled'
    AND NOT EXISTS (
      SELECT 1 FROM transactions 
      WHERE tournament_id = tournaments.id 
        AND type = 'refund'
    );
END;
$$;

-- ============================================================
-- Migration: 00049_update_initialize_bracket_trigger.sql
-- ============================================================

-- Update the initialize_tournament_bracket function to NOT auto-generate brackets
-- Brackets are now generated by the scheduled generate_tournament_brackets function
CREATE OR REPLACE FUNCTION initialize_tournament_bracket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This trigger is now only used for manual bracket generation or legacy support
  -- The main bracket generation happens via generate_tournament_brackets() scheduled function
  
  -- Only run if explicitly triggered and bracket not yet generated
  IF NEW.status = 'active' AND OLD.status = 'open' AND NEW.bracket_generated = false THEN
    -- Call the bracket generation for this specific tournament
    PERFORM generate_tournament_brackets();
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- Migration: 00050_add_full_name_to_profiles.sql
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- ============================================================
-- Migration: 00051_create_world_chat_table.sql
-- ============================================================

-- Create world_chat_messages table
CREATE TABLE IF NOT EXISTS world_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_world_chat_messages_created_at ON world_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_world_chat_messages_user_id ON world_chat_messages(user_id);

-- Enable RLS
ALTER TABLE world_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read world chat messages"
  ON world_chat_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can send world chat messages"
  ON world_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON world_chat_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE world_chat_messages;

-- ============================================================
-- Migration: 00052_fix_notification_types_constraint.sql
-- ============================================================


-- Drop the old constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with all notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'tournament'::text, 
  'match'::text, 
  'payment'::text, 
  'system'::text,
  'challenge_received'::text,
  'tournament_live'::text,
  'mention'::text
]));

-- ============================================================
-- Migration: 00053_add_direct_messages_system_v2.sql
-- ============================================================


-- Direct Messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users NOT NULL,
  receiver_id uuid REFERENCES auth.users NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  image_url text
);

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Helper function for policy
CREATE OR REPLACE FUNCTION can_access_dm(msg_sender_id uuid, msg_receiver_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() = msg_sender_id OR auth.uid() = msg_receiver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
CREATE POLICY "Users can view their own DMs" ON direct_messages
FOR SELECT TO authenticated
USING (can_access_dm(sender_id, receiver_id));

CREATE POLICY "Users can send DMs" ON direct_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark their received DMs as read" ON direct_messages
FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Update notifications constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'tournament'::text, 
  'match'::text, 
  'payment'::text, 
  'system'::text,
  'challenge_received'::text,
  'tournament_live'::text,
  'mention'::text,
  'direct_message'::text
]));

-- Enable realtime for direct_messages
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- ============================================================
-- Migration: 00054_update_tournament_economics.sql
-- ============================================================

-- 1. Update distribute_arena_prizes function to reflect new logic
CREATE OR REPLACE FUNCTION distribute_arena_prizes(
  p_tournament_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_platform_fee numeric;
  v_net_prize numeric;
  v_total_entry_fees numeric;
  v_winner record;
  v_distribution jsonb;
  v_place_amount numeric;
  v_place text;
  v_winner_id uuid;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Only distribute if not already completed (or to prevent double distribution)
  -- But we call this when status CHANGES to completed, so let's check a flag
  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  -- Calculate platform fee (10% of creator's prize pool)
  v_platform_fee := v_tournament.prize_pool * 0.10;
  v_net_prize := v_tournament.prize_pool - v_platform_fee;
  
  -- Calculate total entry fees to be sent to creator
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;

  -- Distribute prizes to winners based on prize_distribution
  -- For now, we mainly support 1st place in this refactor to ensure it works
  -- The tournament should have a winner_id if completed correctly
  
  -- In single elimination, the winner of the final match is the tournament winner
  -- Let's try to find the winner of the final match
  SELECT winner_id INTO v_winner_id 
  FROM match_results 
  WHERE tournament_id = p_tournament_id 
    AND status = 'confirmed'
  ORDER BY round DESC, created_at DESC 
  LIMIT 1;

  IF v_winner_id IS NOT NULL THEN
    -- Distribute the net prize to the winner
    -- (We can expand this to multiple winners based on v_tournament.prize_distribution if needed)
    -- For simplicity and following the user's "sent to the winner" request:
    
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + v_net_prize,
        available_balance = COALESCE(available_balance, 0) + v_net_prize
    WHERE id = v_winner_id;
    
    -- Record transaction for winner
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_winner_id, 
      'payout', 
      v_net_prize, 
      'Tournament prize for winning: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );
  END IF;

  -- Pay total entry fees to creator
  IF v_total_entry_fees > 0 THEN
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + v_total_entry_fees,
        available_balance = COALESCE(available_balance, 0) + v_total_entry_fees
    WHERE id = v_tournament.created_by;

    -- Record transaction for creator
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 
      'payout', 
      v_total_entry_fees, 
      'Entry fees collected for tournament: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );
  END IF;

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;

  -- Mark as distributed
  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;
END;
$$;

-- 2. Add prizes_distributed column to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prizes_distributed boolean DEFAULT false;

-- 3. Update refund_tournament_entry_fees function
CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant record;
  v_tournament record;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Refund Participants
  FOR v_participant IN 
    SELECT user_id, amount_paid 
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
      AND tp.amount_paid > 0
      AND NOT EXISTS (
        SELECT 1 FROM transactions 
        WHERE user_id = tp.user_id 
          AND tournament_id = p_tournament_id 
          AND type = 'refund'
          AND description NOT LIKE 'Creator refund%'
      )
  LOOP
    -- Update user balance
    UPDATE profiles 
    SET arena_currency = COALESCE(arena_currency, 0) + v_participant.amount_paid,
        available_balance = COALESCE(available_balance, 0) + v_participant.amount_paid
    WHERE id = v_participant.user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_participant.user_id, 
      'refund', 
      v_participant.amount_paid, 
      'Refund for cancelled tournament: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );
  END LOOP;

  -- 2. Refund Creator their prize pool payment
  IF v_tournament.prize_pool > 0 THEN
    -- Check if creator already got a refund for this tournament
    IF NOT EXISTS (
      SELECT 1 FROM transactions 
      WHERE user_id = v_tournament.created_by 
        AND tournament_id = p_tournament_id 
        AND type = 'refund'
        AND description LIKE 'Creator refund%'
    ) THEN
      UPDATE profiles 
      SET arena_currency = COALESCE(arena_currency, 0) + v_tournament.prize_pool,
          available_balance = COALESCE(available_balance, 0) + v_tournament.prize_pool
    WHERE id = v_tournament.created_by;

      INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
      VALUES (
        v_tournament.created_by, 
        'refund', 
        v_tournament.prize_pool, 
        'Creator refund for cancelled tournament: ' || v_tournament.name, 
        'completed', 
        p_tournament_id
      );
    END IF;
  END IF;
END;
$$;

-- 4. Create trigger to automatically distribute prizes when tournament is completed
CREATE OR REPLACE FUNCTION handle_tournament_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM distribute_arena_prizes(NEW.id);
  END IF;

  -- Also handle cancellation
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM refund_tournament_entry_fees(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_tournament_status_change ON tournaments;
CREATE TRIGGER trigger_tournament_status_change
  AFTER UPDATE OF status
  ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION handle_tournament_status_change();

-- 5. Add trigger to match_results to complete tournament if final match is confirmed
CREATE OR REPLACE FUNCTION check_for_tournament_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_matches integer;
  v_confirmed_matches integer;
  v_max_players integer;
BEGIN
  -- Only run if a match is confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Get tournament info
    SELECT max_players INTO v_max_players FROM tournaments WHERE id = NEW.tournament_id;
    
    -- In a single elimination bracket, total matches is max_players - 1
    -- Check if all matches are confirmed
    SELECT COUNT(*) INTO v_confirmed_matches FROM match_results 
    WHERE tournament_id = NEW.tournament_id AND status = 'confirmed';
    
    -- If we have enough matches confirmed, it might be the end
    -- For solo tournaments, it's exactly max_players - 1
    IF v_confirmed_matches >= (v_max_players - 1) THEN
      UPDATE tournaments SET status = 'completed' WHERE id = NEW.tournament_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_tournament_completion ON match_results;
CREATE TRIGGER trigger_check_tournament_completion
  AFTER UPDATE OF status
  ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION check_for_tournament_completion();

-- ============================================================
-- Migration: 00055_disable_prize_pool_recalculation.sql
-- ============================================================

-- Drop the trigger that auto-calculates prize pool from entry fees
DROP TRIGGER IF EXISTS trigger_update_prize_pool ON tournaments;

-- Update calculate_prize_pool to just return the current prize pool
CREATE OR REPLACE FUNCTION calculate_prize_pool(
  p_tournament_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prize_pool numeric;
BEGIN
  SELECT prize_pool INTO v_prize_pool FROM tournaments WHERE id = p_tournament_id;
  RETURN v_prize_pool;
END;
$$;

-- ============================================================
-- Migration: 00056_fix_tournament_completion_trigger.sql
-- ============================================================

CREATE OR REPLACE FUNCTION check_for_tournament_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_matches_needed integer;
  v_confirmed_matches integer;
  v_max_players integer;
  v_team_size integer;
  v_total_teams integer;
BEGIN
  -- Only run if a match is confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Get tournament info
    SELECT max_players, team_size INTO v_max_players, v_team_size FROM tournaments WHERE id = NEW.tournament_id;
    
    IF v_team_size > 1 THEN
      v_total_teams := v_max_players / v_team_size;
      v_total_matches_needed := v_total_teams - 1;
    ELSE
      v_total_matches_needed := v_max_players - 1;
    END IF;

    -- Special case for 2 players/teams: 1 match needed
    IF v_total_matches_needed < 1 THEN
      v_total_matches_needed := 1;
    END IF;
    
    -- Check how many matches are confirmed
    SELECT COUNT(*) INTO v_confirmed_matches FROM match_results 
    WHERE tournament_id = NEW.tournament_id AND status = 'confirmed';
    
    -- If we have enough matches confirmed, it might be the end
    IF v_confirmed_matches >= v_total_matches_needed THEN
      UPDATE tournaments SET status = 'completed' WHERE id = NEW.tournament_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- Migration: 00057_refine_winner_identification.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.distribute_arena_prizes(
  p_tournament_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament        record;
  v_platform_fee      numeric;
  v_net_prize         numeric;
  v_total_entry_fees  numeric;
  v_winner_id         uuid;
  v_participant       record;
  v_participant_count integer;
BEGIN

  -- Get tournament details
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Prevent double distribution
  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  -- Calculate fees
  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize    := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;

  -- Calculate total entry fees
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id;

  -- Count total participants for stats
  SELECT COUNT(*) INTO v_participant_count
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id;

  -- Find winner from the final confirmed match
  -- Uses winner_id already set on the tournament row by check_for_tournament_completion
  v_winner_id := v_tournament.winner_id;

  -- Fallback: find from match_results if not set on tournament
  IF v_winner_id IS NULL THEN
    SELECT winner_id INTO v_winner_id
    FROM match_results
    WHERE tournament_id = p_tournament_id
      AND status = 'confirmed'
    ORDER BY round DESC, created_at DESC
    LIMIT 1;
  END IF;

  -- ── Pay winner ───────────────────────────────────────────
  IF v_winner_id IS NOT NULL AND v_net_prize > 0 THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_net_prize,
      available_balance = COALESCE(available_balance, 0) + v_net_prize,
      total_earnings    = COALESCE(total_earnings, 0) + v_net_prize
    WHERE id = v_winner_id;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_winner_id, 'payout', v_net_prize,
      'Tournament prize for winning: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- ── Pay creator entry fees ───────────────────────────────
  IF v_total_entry_fees > 0 AND v_tournament.created_by IS NOT NULL THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_total_entry_fees,
      available_balance = COALESCE(available_balance, 0) + v_total_entry_fees
    WHERE id = v_tournament.created_by;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 'payout', v_total_entry_fees,
      'Entry fees collected for tournament: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- ── Platform fee ─────────────────────────────────────────
  -- WHERE clause required — bare UPDATE causes error 21000
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);

  -- ── Update stats for ALL participants ────────────────────
  -- Loop through every participant and update their profile stats
  FOR v_participant IN
    SELECT tp.user_id
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
  LOOP

    IF v_participant.user_id = v_winner_id THEN

      -- Winner: increment wins, tournaments_played, recalculate win_rate
      UPDATE profiles
      SET
        wins                = COALESCE(wins, 0) + 1,
        tournaments_played  = COALESCE(tournaments_played, 0) + 1,
        current_streak      = COALESCE(current_streak, 0) + 1,
        longest_streak      = GREATEST(
                                COALESCE(longest_streak, 0),
                                COALESCE(current_streak, 0) + 1
                              ),
        win_rate            = CASE
                                WHEN (COALESCE(tournaments_played, 0) + 1) > 0
                                THEN ROUND(
                                  ((COALESCE(wins, 0) + 1)::numeric /
                                  (COALESCE(tournaments_played, 0) + 1)::numeric) * 100,
                                  2
                                )
                                ELSE 0
                              END
      WHERE id = v_participant.user_id;

    ELSE

      -- Loser: increment losses, tournaments_played, reset streak, recalculate win_rate
      UPDATE profiles
      SET
        losses             = COALESCE(losses, 0) + 1,
        tournaments_played = COALESCE(tournaments_played, 0) + 1,
        current_streak     = 0,
        win_rate           = CASE
                               WHEN (COALESCE(tournaments_played, 0) + 1) > 0
                               THEN ROUND(
                                 (COALESCE(wins, 0)::numeric /
                                 (COALESCE(tournaments_played, 0) + 1)::numeric) * 100,
                                 2
                               )
                               ELSE 0
                             END
      WHERE id = v_participant.user_id;

    END IF;

  END LOOP;

  -- ── Mark tournament as distributed ───────────────────────
  UPDATE tournaments
  SET prizes_distributed = true
  WHERE id = p_tournament_id;

END;
$$;

-- ============================================================
-- Migration: 00058_add_transaction_types.sql
-- ============================================================

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'payout';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'deposit';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'tournament_win';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'tournament_fee';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'challenge_fee';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'challenge_win';
-- ============================================================
-- Migration: 00059_fix_distribute_arena_prizes_and_add_notifications.sql
-- ============================================================

CREATE OR REPLACE FUNCTION distribute_arena_prizes(
  p_tournament_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_platform_fee numeric;
  v_net_prize numeric;
  v_total_entry_fees numeric;
  v_winner_id uuid;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Only distribute if not already completed
  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  -- Calculate platform fee (10% of creator's prize pool)
  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;
  
  -- Calculate total entry fees to be sent to creator
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;

  -- Identify the winner of the final match
  -- The final match is always the one in the highest round number
  SELECT winner_id INTO v_winner_id 
  FROM match_results 
  WHERE tournament_id = p_tournament_id 
    AND status = 'confirmed'
  ORDER BY round DESC, created_at DESC 
  LIMIT 1;

  IF v_winner_id IS NOT NULL THEN
    -- Distribute the net prize to the winner
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + v_net_prize,
        available_balance = COALESCE(available_balance, 0) + v_net_prize
    WHERE id = v_winner_id;
    
    -- Record transaction for winner
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_winner_id, 
      'payout', 
      v_net_prize, 
      'Tournament prize for winning: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );

    -- Notify winner
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_winner_id,
      'Tournament Winner!',
      'Congratulations! You won ' || v_tournament.name || ' and received A$' || v_net_prize,
      'tournament',
      '/wallet'
    );
  END IF;

  -- Pay total entry fees to creator
  IF v_total_entry_fees > 0 THEN
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + v_total_entry_fees,
        available_balance = COALESCE(available_balance, 0) + v_total_entry_fees
    WHERE id = v_tournament.created_by;

    -- Record transaction for creator
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 
      'payout', 
      v_total_entry_fees, 
      'Entry fees collected for tournament: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );

    -- Notify creator
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_tournament.created_by,
      'Tournament Entry Fees Collected',
      'You collected A$' || v_total_entry_fees || ' in entry fees from ' || v_tournament.name,
      'payment',
      '/wallet'
    );
  END IF;

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;

  -- Mark as distributed
  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;
END;
$$;

-- ============================================================
-- Migration: 00060_referee_system_overhaul.sql
-- ============================================================

-- 1. Add 'referee' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'referee';

-- 2. Create referee_applications table
CREATE TABLE IF NOT EXISTS referee_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create referee_application_messages table for admin-applicant chat
CREATE TABLE IF NOT EXISTS referee_application_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES referee_applications(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Create referee_assignments table
CREATE TABLE IF NOT EXISTS referee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game game_type NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, game)
);

-- 5. Update disputes table if needed (it already has resolved_by)
-- Let's add a helper function for referee check
CREATE OR REPLACE FUNCTION is_referee(uid uuid, p_game game_type)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM referee_assignments
    WHERE user_id = uid AND game = p_game
  ) OR EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = uid AND role = 'admin'
  );
$$;

-- 6. RLS for referee_applications
ALTER TABLE referee_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications" ON referee_applications
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications" ON referee_applications
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view and update all applications" ON referee_applications
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 7. RLS for referee_application_messages
ALTER TABLE referee_application_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and send messages for their applications" ON referee_application_messages
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM referee_applications 
    WHERE id = application_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- 8. RLS for referee_assignments
ALTER TABLE referee_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view assignments" ON referee_assignments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage assignments" ON referee_assignments
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 9. Update match_results policies to allow referees
CREATE POLICY "Referees can update match results for their assigned games" ON match_results
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_id AND is_referee(auth.uid(), t.game)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_id AND is_referee(auth.uid(), t.game)
  )
);

-- 10. Update disputes policies to allow referees
CREATE POLICY "Referees can view and update disputes for their assigned games" ON disputes
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_id AND is_referee(auth.uid(), t.game)
  )
);

-- 11. Update dispute_messages policies to allow referees
CREATE POLICY "Referees can view and send messages in disputes for their assigned games" ON dispute_messages
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM disputes d
    JOIN tournaments t ON t.id = d.tournament_id
    WHERE d.id = dispute_id AND is_referee(auth.uid(), t.game)
  )
);

-- ============================================================
-- Migration: 00061_bracket_advancement_logic.sql
-- ============================================================

-- Function to advance winner to next match
CREATE OR REPLACE FUNCTION advance_winner_to_next_match()
RETURNS TRIGGER AS $$
DECLARE
  v_next_round integer;
  v_next_match_number integer;
  v_next_match_id text;
  v_is_player1 boolean;
  v_tournament_max_players integer;
  v_num_rounds integer;
  v_match_number integer;
BEGIN
  -- Only run if match is newly confirmed and has a winner
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') AND NEW.winner_id IS NOT NULL THEN
    
    -- Extract current round and match number from match_id (e.g., 'r1-m0')
    -- We assume match_id format is 'r{round}-m{match_number}'
    v_match_number := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    
    v_next_round := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id := 'r' || v_next_round || '-m' || v_next_match_number;
    v_is_player1 := (v_match_number % 2 = 0);

    -- Get tournament info to check if we've reached the end
    SELECT max_players INTO v_tournament_max_players FROM tournaments WHERE id = NEW.tournament_id;
    v_num_rounds := ceil(log(2, v_tournament_max_players));

    -- If there's a next round
    IF v_next_round <= v_num_rounds THEN
      -- Upsert the next match result
      INSERT INTO match_results (
        tournament_id,
        match_id,
        round,
        player1_id,
        player2_id,
        status
      )
      VALUES (
        NEW.tournament_id,
        v_next_match_id,
        v_next_round,
        CASE WHEN v_is_player1 THEN NEW.winner_id ELSE NULL END,
        CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE NULL END,
        'pending'
      )
      ON CONFLICT (tournament_id, match_id) DO UPDATE
      SET 
        player1_id = CASE WHEN v_is_player1 THEN EXCLUDED.player1_id ELSE match_results.player1_id END,
        player2_id = CASE WHEN NOT v_is_player1 THEN EXCLUDED.player2_id ELSE match_results.player2_id END,
        -- Reset statuses if match is now full
        check_in_deadline = CASE 
          WHEN (v_is_player1 AND match_results.player2_id IS NOT NULL) OR (NOT v_is_player1 AND match_results.player1_id IS NOT NULL) 
          THEN now() + interval '5 minutes' 
          ELSE match_results.check_in_deadline 
        END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bracket advancement
DROP TRIGGER IF EXISTS trigger_advance_winner ON match_results;
CREATE TRIGGER trigger_advance_winner
AFTER UPDATE OF status ON match_results
FOR EACH ROW
EXECUTE FUNCTION advance_winner_to_next_match();

-- ============================================================
-- Migration: 00062_bracket_advancement_logic_v2.sql
-- ============================================================

-- Update trigger to also run on INSERT (for byes)
DROP TRIGGER IF EXISTS trigger_advance_winner ON match_results;
CREATE TRIGGER trigger_advance_winner
AFTER INSERT OR UPDATE OF status ON match_results
FOR EACH ROW
EXECUTE FUNCTION advance_winner_to_next_match();

-- ============================================================
-- Migration: 00063_bracket_advancement_logic_v3.sql
-- ============================================================

CREATE OR REPLACE FUNCTION advance_winner_to_next_match()
RETURNS TRIGGER AS $$
DECLARE
  v_next_round integer;
  v_next_match_number integer;
  v_next_match_id text;
  v_is_player1 boolean;
  v_tournament_max_players integer;
  v_num_rounds integer;
  v_match_number integer;
  v_existing_id uuid;
BEGIN
  -- Only run if match is newly confirmed and has a winner
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') AND NEW.winner_id IS NOT NULL THEN
    
    -- Extract current round and match number from match_id (e.g., 'r1-m0')
    IF NEW.match_id NOT LIKE 'r%-m%' THEN
      RETURN NEW;
    END IF;
    
    v_match_number := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    v_next_round := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id := 'r' || v_next_round || '-m' || v_next_match_number;
    v_is_player1 := (v_match_number % 2 = 0);

    -- Get tournament info
    SELECT max_players INTO v_tournament_max_players FROM tournaments WHERE id = NEW.tournament_id;
    v_num_rounds := ceil(log(2, v_tournament_max_players));

    -- If there's a next round
    IF v_next_round <= v_num_rounds THEN
      -- Check if next match already exists
      SELECT id INTO v_existing_id FROM match_results 
      WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;

      IF v_existing_id IS NOT NULL THEN
        -- Update existing match
        UPDATE match_results
        SET 
          player1_id = CASE WHEN v_is_player1 THEN NEW.winner_id ELSE player1_id END,
          player2_id = CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE player2_id END,
          -- Reset statuses if match is updated
          player1_checked_in = CASE WHEN v_is_player1 THEN false ELSE player1_checked_in END,
          player2_checked_in = CASE WHEN NOT v_is_player1 THEN false ELSE player2_checked_in END,
          both_players_ready = false,
          match_started_at = NULL,
          status = 'pending',
          -- Set deadline if now full
          check_in_deadline = CASE 
            WHEN (v_is_player1 AND player2_id IS NOT NULL) OR (NOT v_is_player1 AND player1_id IS NOT NULL) 
            THEN now() + interval '5 minutes' 
            ELSE check_in_deadline 
          END
        WHERE id = v_existing_id;
      ELSE
        -- Insert new match
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          player1_id,
          player2_id,
          status,
          check_in_deadline
        )
        VALUES (
          NEW.tournament_id,
          v_next_match_id,
          v_next_round,
          CASE WHEN v_is_player1 THEN NEW.winner_id ELSE NULL END,
          CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE NULL END,
          'pending',
          NULL -- Don't set deadline yet, wait for both players
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Migration: 00064_enhance_challenges_for_live_match.sql
-- ============================================================

-- Add team support and match tracking to challenges
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS challenger_team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS opponent_team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS challenger_checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS opponent_checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS check_in_deadline timestamptz,
ADD COLUMN IF NOT EXISTS both_players_ready boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS challenger_reported_winner uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS opponent_reported_winner uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS screenshot_url text,
ADD COLUMN IF NOT EXISTS match_started_at timestamptz,
ADD COLUMN IF NOT EXISTS match_deadline timestamptz;

-- Update status check constraint
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_status_check;
ALTER TABLE challenges ADD CONSTRAINT challenges_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled', 'disputed'));

-- Enhance match_messages for challenges
ALTER TABLE match_messages 
ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE;

-- Allow tournament_id and match_id to be nullable if challenge_id is set
ALTER TABLE match_messages ALTER COLUMN tournament_id DROP NOT NULL;
ALTER TABLE match_messages ALTER COLUMN match_id DROP NOT NULL;

-- Update RLS for match_messages to allow challenge participants
DROP POLICY IF EXISTS "Users can view match messages" ON match_messages;
CREATE POLICY "Users can view match messages" ON match_messages
FOR SELECT TO authenticated
USING (
  tournament_id IS NOT NULL OR 
  EXISTS (
    SELECT 1 FROM challenges 
    WHERE id = challenge_id AND (challenger_id = auth.uid() OR opponent_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert match messages" ON match_messages;
CREATE POLICY "Users can insert match messages" ON match_messages
FOR INSERT TO authenticated
WITH CHECK (
  tournament_id IS NOT NULL OR 
  EXISTS (
    SELECT 1 FROM challenges 
    WHERE id = challenge_id AND (challenger_id = auth.uid() OR opponent_id = auth.uid())
  )
);

-- Realtime for challenges
ALTER PUBLICATION supabase_realtime ADD TABLE challenges;

-- ============================================================
-- Migration: 00065_add_winner_team_id_to_challenges.sql
-- ============================================================

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS winner_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

-- ============================================================
-- Migration: 00066_add_social_and_location_fields.sql
-- ============================================================

-- Add location and timezone to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(sender_id, receiver_id)
);

-- RLS for friend_requests
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sent/received friend requests" ON friend_requests
    FOR SELECT TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" ON friend_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update friend request status" ON friend_requests
    FOR UPDATE TO authenticated
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- Create friendships table for easier querying of accepted friends
CREATE TABLE IF NOT EXISTS friendships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- RLS for friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships" ON friendships
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Trigger to automatically create a friendship record when a request is accepted
CREATE OR REPLACE FUNCTION handle_accepted_friend_request()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Insert friendship in both directions for easy querying
        INSERT INTO friendships (user_id, friend_id) VALUES (NEW.sender_id, NEW.receiver_id) ON CONFLICT DO NOTHING;
        INSERT INTO friendships (user_id, friend_id) VALUES (NEW.receiver_id, NEW.sender_id) ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friend_request_accepted
    AFTER UPDATE ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_accepted_friend_request();

-- ============================================================
-- Migration: 00067_fix_match_results_update_policies.sql
-- ============================================================

-- Drop problematic update policies
DROP POLICY IF EXISTS "Players can update their own reports" ON match_results;
DROP POLICY IF EXISTS "Admins can update any match results" ON match_results;
DROP POLICY IF EXISTS "Referees can update match results for their assigned games" ON match_results;

-- Re-create policies with more robust checks
CREATE POLICY "Players can update their own reports" ON match_results
FOR UPDATE TO authenticated
USING (
  (auth.uid() = player1_id OR auth.uid() = player2_id)
)
WITH CHECK (
  (auth.uid() = player1_id OR auth.uid() = player2_id)
);

CREATE POLICY "Admins can update any match results" ON match_results
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::text)
);

CREATE POLICY "Referees can update match results for their assigned games" ON match_results
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = match_results.tournament_id
    AND is_referee(auth.uid(), t.game)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = match_results.tournament_id
    AND is_referee(auth.uid(), t.game)
  )
);

-- ============================================================
-- Migration: 00068_fix_bracket_generation_window.sql
-- ============================================================

-- Update the bracket generation function to be more robust
CREATE OR REPLACE FUNCTION generate_tournament_brackets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_confirmed_count integer;
  v_total_needed integer;
  v_i integer;
  v_p1_id uuid;
  v_p2_id uuid;
  v_t1_id uuid;
  v_t2_id uuid;
  v_check_in_deadline timestamptz;
  v_match_id text;
  v_p1_gamertag text;
  v_p2_gamertag text;
BEGIN
  -- Find tournaments that start soon (within 15 minutes) or have already started,
  -- but haven't generated brackets yet.
  FOR v_tournament IN 
    SELECT * FROM tournaments
    WHERE status = 'open'
      AND bracket_generated = false
      AND start_time <= now() + interval '15 minutes'
      AND current_players >= min_participants
  LOOP
    -- Mark bracket as generated
    UPDATE tournaments 
    SET bracket_generated = true, bracket_generated_at = now()
    WHERE id = v_tournament.id;

    IF v_tournament.team_size > 1 THEN
      -- Team-based tournament logic
      SELECT count(*) INTO v_confirmed_count FROM tournament_teams WHERE tournament_id = v_tournament.id;
      v_total_needed := v_tournament.max_players / v_tournament.team_size;
      v_check_in_deadline := v_tournament.start_time + interval '5 minutes';

      FOR v_i IN 0..(v_total_needed / 2 - 1) LOOP
        v_match_id := 'r1-m' || v_i;
        
        SELECT id, captain_id INTO v_t1_id, v_p1_id FROM (
          SELECT id, captain_id, row_number() OVER (ORDER BY created_at ASC) as seed 
          FROM tournament_teams WHERE tournament_id = v_tournament.id
        ) s WHERE seed = v_i + 1;
        
        SELECT id, captain_id INTO v_t2_id, v_p2_id FROM (
          SELECT id, captain_id, row_number() OVER (ORDER BY created_at ASC) as seed 
          FROM tournament_teams WHERE tournament_id = v_tournament.id
        ) s WHERE seed = v_total_needed - v_i;

        IF v_t1_id IS NOT NULL AND v_t2_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, player2_id, team1_id, team2_id, 
            check_in_deadline, check_in_started_at, status
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_p2_id, v_t1_id, v_t2_id, 
            v_check_in_deadline, v_tournament.start_time, 'pending'
          );

          -- Send pairing notifications to both captains
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES 
            (v_p1_id, 'Match Pairing Ready', 'Your match pairing for ' || v_tournament.name || ' is ready. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id),
            (v_p2_id, 'Match Pairing Ready', 'Your match pairing for ' || v_tournament.name || ' is ready. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id);
        ELSIF v_t1_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, team1_id, winner_id, status, admin_override
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_t1_id, v_p1_id, 'confirmed', true
          );
        END IF;
      END LOOP;

    ELSE
      -- Individual tournament logic
      WITH seeded_confirmed AS (
        SELECT id, user_id, gamertag, row_number() OVER (ORDER BY created_at ASC) as seed
        FROM tournament_participants
        WHERE tournament_id = v_tournament.id AND is_standby = false
        LIMIT v_tournament.max_players
      )
      UPDATE tournament_participants tp
      SET bracket_seed = sc.seed
      FROM seeded_confirmed sc
      WHERE tp.id = sc.id;

      SELECT count(*) INTO v_confirmed_count FROM tournament_participants 
      WHERE tournament_id = v_tournament.id AND bracket_seed IS NOT NULL;

      v_total_needed := v_tournament.max_players;
      v_check_in_deadline := v_tournament.start_time + interval '5 minutes';

      FOR v_i IN 0..(v_total_needed / 2 - 1) LOOP
        v_match_id := 'r1-m' || v_i;
        
        SELECT user_id, gamertag INTO v_p1_id, v_p1_gamertag 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND bracket_seed = v_i + 1;
        
        SELECT user_id, gamertag INTO v_p2_id, v_p2_gamertag 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND bracket_seed = v_total_needed - v_i;

        IF v_p1_id IS NOT NULL AND v_p2_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, player2_id, 
            check_in_deadline, check_in_started_at, status
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_p2_id, 
            v_check_in_deadline, v_tournament.start_time, 'pending'
          );

          -- Send pairing notifications
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES 
            (v_p1_id, 'Match Pairing Ready', 'You will face ' || COALESCE(v_p2_gamertag, 'opponent') || ' in ' || v_tournament.name || '. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id),
            (v_p2_id, 'Match Pairing Ready', 'You will face ' || COALESCE(v_p1_gamertag, 'opponent') || ' in ' || v_tournament.name || '. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id);
        ELSIF v_p1_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, winner_id, status, admin_override
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_p1_id, 'confirmed', true
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- Migration: 00069_fix_tournament_progression_logic.sql
-- ============================================================

-- ============================================================
-- FUNCTION 1: advance_winner_to_next_match
--
-- WHAT WAS FIXED:
--   Removed max_players lookup entirely.
--   Now reads MAX(round) directly from existing match_results
--   rows for this tournament. This is always the true final
--   round regardless of capacity, bye count, or player count.
--   Works correctly for 2 players (1 round), 6 players (3 rounds),
--   any number.
-- ============================================================

CREATE OR REPLACE FUNCTION public.advance_winner_to_next_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next_round         integer;
  v_next_match_number  integer;
  v_next_match_id      text;
  v_is_player1         boolean;
  v_num_rounds         integer;
  v_match_number       integer;
  v_existing_id        uuid;
BEGIN

  -- Only run when a match transitions to confirmed and has a winner
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
    AND NEW.winner_id IS NOT NULL
  THEN

    -- Only process match IDs that follow the r{n}-m{n} pattern
    IF NEW.match_id NOT LIKE 'r%-m%' THEN
      RETURN NEW;
    END IF;

    -- Extract current match number from match_id (e.g. 'r1-m3' -> 3)
    v_match_number      := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    v_next_round        := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;

    -- Even match number = player1 slot, odd = player2 slot
    v_is_player1 := (v_match_number % 2 = 0);

    -- Read the actual final round from existing rows.
    -- Never use max_players -- it reflects capacity, not reality.
    SELECT MAX(round) INTO v_num_rounds
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    -- If there is a next round to advance into
    IF v_next_round <= v_num_rounds THEN

      -- Check if the next match row already exists
      SELECT id INTO v_existing_id
      FROM match_results
      WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;

      IF v_existing_id IS NOT NULL THEN

        -- Update the existing next-round row
        UPDATE match_results
        SET
          player1_id = CASE WHEN v_is_player1 THEN NEW.winner_id ELSE player1_id END,
          player2_id = CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE player2_id END,
          player1_checked_in = CASE WHEN v_is_player1 THEN false ELSE player1_checked_in END,
          player2_checked_in = CASE WHEN NOT v_is_player1 THEN false ELSE player2_checked_in END,
          both_players_ready = false,
          match_started_at   = NULL,
          status             = 'pending',
          -- Only open check-in once BOTH players are in the slot
          check_in_deadline  = CASE
            WHEN (v_is_player1 AND player2_id IS NOT NULL)
              OR (NOT v_is_player1 AND player1_id IS NOT NULL)
            THEN now() + interval '5 minutes'
            ELSE check_in_deadline
          END
        WHERE id = v_existing_id;

      ELSE

        -- Create new match row with only this winner filled in.
        -- check_in_deadline stays NULL until second player arrives.
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          player1_id,
          player2_id,
          status,
          check_in_deadline
        )
        VALUES (
          NEW.tournament_id,
          v_next_match_id,
          v_next_round,
          CASE WHEN v_is_player1 THEN NEW.winner_id ELSE NULL END,
          CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE NULL END,
          'pending',
          NULL
        );

      END IF;

    END IF;

  END IF;

  RETURN NEW;

END;
$function$;


-- ============================================================
-- FUNCTION 2: check_for_tournament_completion
--
-- WHAT WAS FIXED:
--   Removed all max_players and match-counting logic entirely.
--   Now simply checks: is the match just confirmed THE final match?
--   The final is always the match at the highest round, match index 0
--   (match_id = 'r{maxRound}-m0').
--   This works for any player count with zero math required.
--   Also now writes winner_id to the tournaments table on completion.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_for_tournament_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max_round   integer;
  v_final_match text;
BEGIN

  -- Only run when a match transitions to confirmed
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
  THEN

    -- The final is always the highest round, match index 0
    SELECT MAX(round) INTO v_max_round
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    v_final_match := 'r' || v_max_round || '-m0';

    -- If the match just confirmed IS the final, mark tournament complete
    IF NEW.match_id = v_final_match AND NEW.winner_id IS NOT NULL THEN
      UPDATE tournaments
      SET
        status    = 'completed',
        winner_id = NEW.winner_id
      WHERE id = NEW.tournament_id;
    END IF;

  END IF;

  RETURN NEW;

END;
$function$;

-- ============================================================
-- Migration: 00070_fix_tournament_progression_logic_v2.sql
-- ============================================================

-- ============================================================
-- FUNCTION 1: advance_winner_to_next_match
-- ============================================================

CREATE OR REPLACE FUNCTION public.advance_winner_to_next_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next_round         integer;
  v_next_match_number  integer;
  v_next_match_id      text;
  v_is_player1         boolean;
  v_num_rounds         integer;
  v_match_number       integer;
  v_existing_id        uuid;
BEGIN

  -- Only run when a match transitions to confirmed and has a winner
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
    AND NEW.winner_id IS NOT NULL
  THEN

    -- Only process match IDs that follow the r{n}-m{n} pattern
    IF NEW.match_id NOT LIKE 'r%-m%' THEN
      RETURN NEW;
    END IF;

    -- Extract current match number from match_id (e.g. 'r1-m3' -> 3)
    v_match_number      := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    v_next_round        := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;

    -- Even match number = player1 slot, odd = player2 slot
    v_is_player1 := (v_match_number % 2 = 0);

    -- Read the actual final round from existing rows.
    -- Never use max_players -- it reflects capacity, not reality.
    SELECT MAX(round) INTO v_num_rounds
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    -- If there is a next round to advance into
    IF v_next_round <= v_num_rounds THEN

      -- Check if the next match row already exists
      SELECT id INTO v_existing_id
      FROM match_results
      WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;

      IF v_existing_id IS NOT NULL THEN

        -- Update the existing next-round row
        UPDATE match_results
        SET
          player1_id = CASE WHEN v_is_player1 THEN NEW.winner_id ELSE player1_id END,
          player2_id = CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE player2_id END,
          player1_checked_in = CASE WHEN v_is_player1 THEN false ELSE player1_checked_in END,
          player2_checked_in = CASE WHEN NOT v_is_player1 THEN false ELSE player2_checked_in END,
          both_players_ready = false,
          match_started_at   = NULL,
          status             = 'pending',
          -- Only open check-in once BOTH players are in the slot
          check_in_deadline  = CASE
            WHEN (v_is_player1 AND player2_id IS NOT NULL)
              OR (NOT v_is_player1 AND player1_id IS NOT NULL)
            THEN now() + interval '5 minutes'
            ELSE check_in_deadline
          END
        WHERE id = v_existing_id;

      ELSE

        -- Create new match row with only this winner filled in.
        -- check_in_deadline stays NULL until second player arrives.
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          player1_id,
          player2_id,
          status,
          check_in_deadline
        )
        VALUES (
          NEW.tournament_id,
          v_next_match_id,
          v_next_round,
          CASE WHEN v_is_player1 THEN NEW.winner_id ELSE NULL END,
          CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE NULL END,
          'pending',
          NULL
        );

      END IF;

    END IF;

  END IF;

  RETURN NEW;

END;
$function$;


-- ============================================================
-- FUNCTION 2: check_for_tournament_completion
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_for_tournament_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max_round   integer;
  v_final_match text;
BEGIN

  -- Only run when a match transitions to confirmed
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
  THEN

    -- The final is always the highest round, match index 0
    SELECT MAX(round) INTO v_max_round
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    v_final_match := 'r' || v_max_round || '-m0';

    -- If the match just confirmed IS the final, mark tournament complete
    IF NEW.match_id = v_final_match AND NEW.winner_id IS NOT NULL THEN
      UPDATE tournaments
      SET
        status    = 'completed',
        winner_id = NEW.winner_id
      WHERE id = NEW.tournament_id;
    END IF;

  END IF;

  RETURN NEW;

END;
$function$;

-- ============================================================
-- Migration: 00071_update_auto_start_match_logic.sql
-- ============================================================

CREATE OR REPLACE FUNCTION auto_start_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

  -- Only set check-in deadline when BOTH players are present.
  -- If only one player slot is filled (first winner just arrived),
  -- leave check_in_deadline as NULL and wait for the second player.
  IF NEW.check_in_deadline IS NULL
    AND NEW.player1_id IS NOT NULL
    AND NEW.player2_id IS NOT NULL
  THEN
    NEW.check_in_deadline := now() + interval '5 minutes';
  END IF;

  -- Only start match timer when both players have checked in
  IF NEW.player1_checked_in AND NEW.player2_checked_in AND NEW.match_started_at IS NULL THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
    NEW.both_players_ready := true;
  END IF;

  RETURN NEW;

END;
$$;
-- ============================================================
-- Migration: 00072_update_auto_start_match_v3.sql
-- ============================================================

CREATE OR REPLACE FUNCTION auto_start_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only set check-in deadline when BOTH players are present.
  -- If only one slot is filled, leave NULL and wait for second player.
  IF NEW.check_in_deadline IS NULL
    AND NEW.player1_id IS NOT NULL
    AND NEW.player2_id IS NOT NULL
  THEN
    NEW.check_in_deadline := now() + interval '5 minutes';
  END IF;

  -- Only start match timer when both players have checked in
  IF NEW.player1_checked_in AND NEW.player2_checked_in AND NEW.match_started_at IS NULL THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
    NEW.both_players_ready := true;
  END IF;

  RETURN NEW;
END;
$$;
-- ============================================================
-- Migration: 00073_sync_challenge_logic_with_tournaments.sql
-- ============================================================

-- 1. Add submitted_by column for RLS parity with match_results
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);

-- 2. Add RLS policies for live challenges
DROP POLICY IF EXISTS "Participants can update live challenges" ON challenges;
CREATE POLICY "Participants can update live challenges"
  ON challenges FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND
    (status IN ('accepted', 'disputed'))
  )
  WITH CHECK (
    auth.uid() = submitted_by
  );

-- 3. Create auto_start_challenge function to match tournament logic
CREATE OR REPLACE FUNCTION auto_start_challenge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

  -- Only set check-in deadline when BOTH players are present.
  -- In challenges, they are usually both present from the start once 'accepted',
  -- but we'll follow the same logic for consistency.
  IF NEW.status = 'accepted' AND NEW.check_in_deadline IS NULL
    AND NEW.challenger_id IS NOT NULL
    AND NEW.opponent_id IS NOT NULL
  THEN
    NEW.check_in_deadline := now() + interval '5 minutes';
  END IF;

  -- Only start match timer when both players have checked in
  IF NEW.status = 'accepted' 
    AND NEW.challenger_checked_in 
    AND NEW.opponent_checked_in 
    AND NEW.match_started_at IS NULL 
  THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + interval '30 minutes';
    NEW.both_players_ready := true;
  END IF;

  RETURN NEW;

END;
$$;

-- 4. Create trigger for auto_start_challenge
DROP TRIGGER IF EXISTS trigger_auto_start_challenge ON challenges;
CREATE TRIGGER trigger_auto_start_challenge
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION auto_start_challenge();

-- ============================================================
-- Migration: 00074_add_challenge_completion_trigger.sql
-- ============================================================

-- Function to handle challenge completion when reports agree
CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run if status is accepted or disputed
  IF NEW.status IN ('accepted', 'disputed') THEN
    
    -- Check if both players have reported and they agree
    IF NEW.challenger_reported_winner IS NOT NULL 
       AND NEW.opponent_reported_winner IS NOT NULL 
       AND NEW.challenger_reported_winner = NEW.opponent_reported_winner
    THEN
      -- Agreement reached
      NEW.status := 'completed';
      NEW.winner_id := NEW.challenger_reported_winner;
      NEW.completed_at := now();
      
      -- If it was a dispute, we can clear it or leave it as history
      -- But here we just complete it.
    
    -- Check if both have reported but they disagree
    ELSIF NEW.challenger_reported_winner IS NOT NULL 
          AND NEW.opponent_reported_winner IS NOT NULL 
          AND NEW.challenger_reported_winner != NEW.opponent_reported_winner
    THEN
      -- Conflict -> Dispute
      NEW.status := 'disputed';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for challenge completion
DROP TRIGGER IF EXISTS trigger_handle_challenge_completion ON challenges;
CREATE TRIGGER trigger_handle_challenge_completion
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION handle_challenge_completion();

-- ============================================================
-- Migration: 00075_schema_fix_match_results.sql
-- ============================================================

-- ============================================================
-- FIX 1: Make player columns nullable
-- ============================================================

ALTER TABLE match_results
  ALTER COLUMN player1_id DROP NOT NULL,
  ALTER COLUMN player2_id DROP NOT NULL;


-- ============================================================
-- FIX 2: Add submitted_by column if it doesn't exist
-- ============================================================

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES profiles(id);


-- ============================================================
-- FIX 3: Add admin and referee INSERT policies
-- ============================================================

CREATE POLICY "Admins can insert match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::text)
);

CREATE POLICY "Referees can insert match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = match_results.tournament_id
    AND is_referee(auth.uid(), t.game)
  )
);


-- ============================================================
-- FIX 4: Update the player INSERT policy to handle null slots
-- ============================================================

DROP POLICY IF EXISTS "Players can insert their match results" ON match_results;

CREATE POLICY "Players can insert their match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = player1_id
  OR auth.uid() = player2_id
  OR (player1_id IS NULL AND player2_id IS NOT NULL AND auth.uid() = player2_id)
  OR (player2_id IS NULL AND player1_id IS NOT NULL AND auth.uid() = player1_id)
);
-- ============================================================
-- Migration: 00076_rls_policy_fix_match_results.sql
-- ============================================================

-- Drop all existing UPDATE and INSERT policies so we can
-- replace them cleanly with NULL-safe versions
DROP POLICY IF EXISTS "Players can update their own reports" ON match_results;
DROP POLICY IF EXISTS "Admins can update any match results" ON match_results;
DROP POLICY IF EXISTS "Referees can update match results for their assigned games" ON match_results;
DROP POLICY IF EXISTS "Players can insert their match results" ON match_results;
DROP POLICY IF EXISTS "Admins can insert match results" ON match_results;
DROP POLICY IF EXISTS "Referees can insert match results" ON match_results;


-- ============================================================
-- INSERT POLICIES
-- ============================================================

-- Players: allow insert when they are either player slot,
-- or when one slot is NULL (trigger-created partial row)
CREATE POLICY "Players can insert their match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = player1_id
  OR auth.uid() = player2_id
  OR (player1_id IS NULL)
  OR (player2_id IS NULL)
);

-- Admins: full insert access
CREATE POLICY "Admins can insert match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::text)
);

-- Referees: insert access for their assigned tournaments
CREATE POLICY "Referees can insert match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = match_results.tournament_id
    AND is_referee(auth.uid(), t.game)
  )
);


-- ============================================================
-- UPDATE POLICIES
-- ============================================================

-- Players: NULL-safe check using IS NOT DISTINCT FROM.
-- Unlike =, IS NOT DISTINCT FROM handles NULL correctly:
-- (auth.uid() IS NOT DISTINCT FROM NULL) returns FALSE not NULL.
-- This means the policy works even when a player slot is NULL.
CREATE POLICY "Players can update their own reports" ON match_results
FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT DISTINCT FROM player1_id
  OR auth.uid() IS NOT DISTINCT FROM player2_id
)
WITH CHECK (
  auth.uid() IS NOT DISTINCT FROM player1_id
  OR auth.uid() IS NOT DISTINCT FROM player2_id
);

-- Admins: full update access, no NULL issues
CREATE POLICY "Admins can update any match results" ON match_results
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::text)
);

-- Referees: update access for their assigned tournaments
CREATE POLICY "Referees can update match results for their assigned games" ON match_results
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = match_results.tournament_id
    AND is_referee(auth.uid(), t.game)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = match_results.tournament_id
    AND is_referee(auth.uid(), t.game)
  )
);
-- ============================================================
-- Migration: 00077_rpc_match_functions.sql
-- ============================================================

-- ============================================================
-- FUNCTION 1: confirm_match_result
-- Called when both players agree on a winner.
-- Finds or creates the match row and sets it to confirmed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_match_result(
  p_tournament_id uuid,
  p_match_id      text,
  p_round         integer,
  p_player1_id    uuid,
  p_player2_id    uuid,
  p_winner_id     uuid,
  p_reported_by   uuid,
  p_report_field  text  -- 'player1_reported_winner' or 'player2_reported_winner'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing    match_results%ROWTYPE;
  v_other_report uuid;
  v_new_status  text;
  v_result      json;
BEGIN
  -- Fetch existing row
  SELECT * INTO v_existing
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND match_id = p_match_id;

  IF v_existing.id IS NULL THEN
    -- No row yet — insert with this player's report
    INSERT INTO match_results (
      tournament_id, match_id, round,
      player1_id, player2_id,
      player1_reported_winner, player2_reported_winner,
      submitted_by, status
    )
    VALUES (
      p_tournament_id, p_match_id, p_round,
      p_player1_id, p_player2_id,
      CASE WHEN p_report_field = 'player1_reported_winner' THEN p_winner_id ELSE NULL END,
      CASE WHEN p_report_field = 'player2_reported_winner' THEN p_winner_id ELSE NULL END,
      p_reported_by, 'pending'
    );
    RETURN json_build_object('status', 'pending', 'message', 'Result submitted. Waiting for opponent.');
  ELSE
    -- Row exists — check what the other player reported
    v_other_report := CASE
      WHEN p_report_field = 'player1_reported_winner' THEN v_existing.player2_reported_winner
      ELSE v_existing.player1_reported_winner
    END;

    -- Determine new status
    IF v_other_report IS NOT NULL THEN
      IF v_other_report = p_winner_id THEN
        v_new_status := 'confirmed';
      ELSE
        v_new_status := 'disputed';
      END IF;
    ELSE
      v_new_status := 'pending';
    END IF;

    -- Update by primary key — always safe
    UPDATE match_results
    SET
      player1_reported_winner = CASE WHEN p_report_field = 'player1_reported_winner' THEN p_winner_id ELSE player1_reported_winner END,
      player2_reported_winner = CASE WHEN p_report_field = 'player2_reported_winner' THEN p_winner_id ELSE player2_reported_winner END,
      submitted_by = p_reported_by,
      winner_id    = CASE WHEN v_new_status = 'confirmed' THEN p_winner_id ELSE winner_id END,
      status       = v_new_status,
      updated_at   = now()
    WHERE id = v_existing.id;

    RETURN json_build_object(
      'status', v_new_status,
      'message', CASE
        WHEN v_new_status = 'confirmed' THEN 'Match confirmed. Winner advancing.'
        WHEN v_new_status = 'disputed'  THEN 'Results conflict. Dispute raised.'
        ELSE 'Result submitted. Waiting for opponent.'
      END
    );
  END IF;
END;
$$;

-- ============================================================
-- FUNCTION 2: admin_override_match
-- Called when admin clicks override in dispute center.
-- Finds or creates the match row and forces confirmation.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_override_match(
  p_tournament_id uuid,
  p_match_id      text,
  p_round         integer,
  p_player1_id    uuid,
  p_player2_id    uuid,
  p_winner_id     uuid,
  p_admin_id      uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing match_results%ROWTYPE;
BEGIN
  -- Fetch existing row
  SELECT * INTO v_existing
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND match_id = p_match_id;

  IF v_existing.id IS NULL THEN
    -- No row yet — insert as confirmed immediately
    INSERT INTO match_results (
      tournament_id, match_id, round,
      player1_id, player2_id,
      winner_id, status,
      admin_override, submitted_by
    )
    VALUES (
      p_tournament_id, p_match_id, p_round,
      p_player1_id, p_player2_id,
      p_winner_id, 'confirmed',
      true, p_admin_id
    );
  ELSE
    -- Row exists — force confirmed by primary key
    UPDATE match_results
    SET
      winner_id      = p_winner_id,
      status         = 'confirmed',
      admin_override = true,
      submitted_by   = p_admin_id,
      updated_at     = now()
    WHERE id = v_existing.id;
  END IF;

  RETURN json_build_object(
    'status', 'confirmed',
    'message', 'Admin override applied successfully.'
  );
END;
$$;

-- ============================================================
-- Grant execute permission to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION public.confirm_match_result TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_override_match TO authenticated;
-- ============================================================
-- Migration: 00078_final_fix_match_results.sql
-- ============================================================

-- ============================================================
-- STEP 1: Delete duplicate rows
-- Keep only the most recently updated row per
-- (tournament_id, match_id) pair.
-- ============================================================
DELETE FROM match_results
WHERE id NOT IN (
  SELECT DISTINCT ON (tournament_id, match_id) id
  FROM match_results
  ORDER BY tournament_id, match_id, updated_at DESC NULLS LAST
);

-- ============================================================
-- STEP 2: Add the UNIQUE constraint
-- Prevents duplicate rows from ever being created again.
-- ============================================================
ALTER TABLE match_results
  ADD CONSTRAINT match_results_tournament_match_unique
  UNIQUE (tournament_id, match_id);

-- ============================================================
-- STEP 3: Rebuild advance_winner_to_next_match with
-- defensive LIMIT 1 on all SELECT INTO statements.
-- ============================================================
CREATE OR REPLACE FUNCTION public.advance_winner_to_next_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next_round         integer;
  v_next_match_number  integer;
  v_next_match_id      text;
  v_is_player1         boolean;
  v_num_rounds         integer;
  v_match_number       integer;
  v_existing_id        uuid;
BEGIN
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
    AND NEW.winner_id IS NOT NULL
  THEN
    IF NEW.match_id NOT LIKE 'r%-m%' THEN
      RETURN NEW;
    END IF;
    v_match_number      := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    v_next_round        := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;
    v_is_player1        := (v_match_number % 2 = 0);
    
    SELECT MAX(round) INTO v_num_rounds
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    IF v_next_round <= v_num_rounds THEN
      SELECT id INTO v_existing_id
      FROM match_results
      WHERE tournament_id = NEW.tournament_id
        AND match_id = v_next_match_id
      LIMIT 1;
      
      IF v_existing_id IS NOT NULL THEN
        UPDATE match_results
        SET
          player1_id         = CASE WHEN v_is_player1 THEN NEW.winner_id ELSE player1_id END,
          player2_id         = CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE player2_id END,
          player1_checked_in = CASE WHEN v_is_player1 THEN false ELSE player1_checked_in END,
          player2_checked_in = CASE WHEN NOT v_is_player1 THEN false ELSE player2_checked_in END,
          both_players_ready = false,
          match_started_at   = NULL,
          status             = 'pending',
          check_in_deadline  = CASE
            WHEN (v_is_player1 AND player2_id IS NOT NULL)
              OR (NOT v_is_player1 AND player1_id IS NOT NULL)
            THEN now() + interval '5 minutes'
            ELSE check_in_deadline
          END
        WHERE id = v_existing_id;
      ELSE
        INSERT INTO match_results (
          tournament_id, match_id, round,
          player1_id, player2_id,
          status, check_in_deadline
        )
        VALUES (
          NEW.tournament_id, v_next_match_id, v_next_round,
          CASE WHEN v_is_player1 THEN NEW.winner_id ELSE NULL END,
          CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE NULL END,
          'pending', NULL
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- STEP 4: Fix the trigger so advance_winner only fires on
-- UPDATE — not INSERT.
-- ============================================================
DROP TRIGGER IF EXISTS trigger_advance_winner ON match_results;
CREATE TRIGGER trigger_advance_winner
  AFTER UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION advance_winner_to_next_match();

-- ============================================================
-- STEP 5: Rebuild confirm_match_result RPC to use
-- INSERT ON CONFLICT instead of SELECT then INSERT/UPDATE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_match_result(
  p_tournament_id uuid,
  p_match_id      text,
  p_round         integer,
  p_player1_id    uuid,
  p_player2_id    uuid,
  p_winner_id     uuid,
  p_reported_by   uuid,
  p_report_field  text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing     match_results%ROWTYPE;
  v_other_report uuid;
  v_new_status   text;
BEGIN
  -- Upsert: create the row if it doesn't exist, do nothing if it does
  INSERT INTO match_results (
    tournament_id, match_id, round,
    player1_id, player2_id,
    player1_reported_winner, player2_reported_winner,
    submitted_by, status
  )
  VALUES (
    p_tournament_id, p_match_id, p_round,
    p_player1_id, p_player2_id,
    CASE WHEN p_report_field = 'player1_reported_winner' THEN p_winner_id ELSE NULL END,
    CASE WHEN p_report_field = 'player2_reported_winner' THEN p_winner_id ELSE NULL END,
    p_reported_by, 'pending'
  )
  ON CONFLICT (tournament_id, match_id) DO NOTHING;

  -- Now fetch the single guaranteed row
  SELECT * INTO v_existing
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND match_id = p_match_id;

  -- Get what the other player reported
  v_other_report := CASE
    WHEN p_report_field = 'player1_reported_winner' THEN v_existing.player2_reported_winner
    ELSE v_existing.player1_reported_winner
  END;

  -- Determine status
  IF v_other_report IS NOT NULL THEN
    v_new_status := CASE WHEN v_other_report = p_winner_id THEN 'confirmed' ELSE 'disputed' END;
  ELSE
    v_new_status := 'pending';
  END IF;

  -- Single safe update by primary key
  UPDATE match_results
  SET
    player1_reported_winner = CASE WHEN p_report_field = 'player1_reported_winner' THEN p_winner_id ELSE player1_reported_winner END,
    player2_reported_winner = CASE WHEN p_report_field = 'player2_reported_winner' THEN p_winner_id ELSE player2_reported_winner END,
    submitted_by = p_reported_by,
    winner_id    = CASE WHEN v_new_status = 'confirmed' THEN p_winner_id ELSE winner_id END,
    status       = v_new_status,
    updated_at   = now()
  WHERE id = v_existing.id;

  RETURN json_build_object(
    'status', v_new_status,
    'message', CASE
      WHEN v_new_status = 'confirmed' THEN 'Match confirmed. Winner advancing.'
      WHEN v_new_status = 'disputed'  THEN 'Results conflict. Dispute raised.'
      ELSE 'Result submitted. Waiting for opponent.'
    END
  );
END;
$$;

-- ============================================================
-- STEP 6: Rebuild admin_override_match RPC with same
-- INSERT ON CONFLICT pattern for safety.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_override_match(
  p_tournament_id uuid,
  p_match_id      text,
  p_round         integer,
  p_player1_id    uuid,
  p_player2_id    uuid,
  p_winner_id     uuid,
  p_admin_id      uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing match_results%ROWTYPE;
BEGIN
  -- Upsert: create row if missing, do nothing if exists
  INSERT INTO match_results (
    tournament_id, match_id, round,
    player1_id, player2_id,
    winner_id, status,
    admin_override, submitted_by
  )
  VALUES (
    p_tournament_id, p_match_id, p_round,
    p_player1_id, p_player2_id,
    p_winner_id, 'confirmed',
    true, p_admin_id
  )
  ON CONFLICT (tournament_id, match_id) DO NOTHING;

  -- Fetch the single guaranteed row
  SELECT * INTO v_existing
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND match_id = p_match_id;

  -- Force confirm by primary key
  UPDATE match_results
  SET
    winner_id      = p_winner_id,
    status         = 'confirmed',
    admin_override = true,
    submitted_by   = p_admin_id,
    updated_at     = now()
  WHERE id = v_existing.id;

  RETURN json_build_object(
    'status', 'confirmed',
    'message', 'Admin override applied successfully.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_match_result TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_override_match TO authenticated;
-- ============================================================
-- Migration: 00079_targeted_fix.sql
-- ============================================================

-- FIX 1: Fix the bare UPDATE in distribute_arena_prizes
CREATE OR REPLACE FUNCTION public.distribute_arena_prizes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament    tournaments%ROWTYPE;
  v_prize_pool    numeric;
  v_platform_fee  numeric;
  v_winner_prize  numeric;
BEGIN
  -- Fetch the tournament
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = NEW.tournament_id
  LIMIT 1;

  IF v_tournament.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only distribute if tournament just became completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    v_prize_pool   := COALESCE(v_tournament.prize_pool, 0);
    v_platform_fee := v_prize_pool * 0.1;  -- 10% platform fee
    v_winner_prize := v_prize_pool - v_platform_fee;

    -- Update platform settings WITH a WHERE clause using LIMIT 1 subquery
    UPDATE platform_settings
    SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee
    WHERE id = (SELECT id FROM platform_settings LIMIT 1);

    -- Record the prize payout for the winner
    IF v_tournament.winner_id IS NOT NULL AND v_winner_prize > 0 THEN
      INSERT INTO prize_payouts (
        tournament_id,
        user_id,
        amount,
        status,
        created_at
      )
      VALUES (
        v_tournament.id,
        v_tournament.winner_id,
        v_winner_prize,
        'pending',
        now()
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- FIX 2: Drop and recreate trigger_advance_winner as UPDATE ONLY
DROP TRIGGER IF EXISTS trigger_advance_winner ON match_results;
CREATE TRIGGER trigger_advance_winner
  AFTER UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION advance_winner_to_next_match();

-- FIX 3: Verify and clean duplicate rows, then enforce the unique constraint
DELETE FROM match_results
WHERE id NOT IN (
  SELECT DISTINCT ON (tournament_id, match_id) id
  FROM match_results
  ORDER BY tournament_id, match_id, updated_at DESC NULLS LAST
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'match_results'
      AND constraint_name = 'match_results_tournament_match_unique'
  ) THEN
    ALTER TABLE match_results
      ADD CONSTRAINT match_results_tournament_match_unique
      UNIQUE (tournament_id, match_id);
  END IF;
END $$;

-- FIX 4: Add LIMIT 1 guard to advance_winner function
CREATE OR REPLACE FUNCTION public.advance_winner_to_next_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next_round         integer;
  v_next_match_number  integer;
  v_next_match_id      text;
  v_is_player1         boolean;
  v_num_rounds         integer;
  v_match_number       integer;
  v_existing_id        uuid;
BEGIN
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
    AND NEW.winner_id IS NOT NULL
  THEN
    IF NEW.match_id NOT LIKE 'r%-m%' THEN
      RETURN NEW;
    END IF;

    v_match_number      := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    v_next_round        := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;
    v_is_player1        := (v_match_number % 2 = 0);

    SELECT MAX(round) INTO v_num_rounds
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    IF v_next_round <= v_num_rounds THEN
      SELECT id INTO v_existing_id
      FROM match_results
      WHERE tournament_id = NEW.tournament_id
        AND match_id = v_next_match_id
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        UPDATE match_results
        SET
          player1_id         = CASE WHEN v_is_player1 THEN NEW.winner_id ELSE player1_id END,
          player2_id         = CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE player2_id END,
          player1_checked_in = CASE WHEN v_is_player1 THEN false ELSE player1_checked_in END,
          player2_checked_in = CASE WHEN NOT v_is_player1 THEN false ELSE player2_checked_in END,
          both_players_ready = false,
          match_started_at   = NULL,
          status             = 'pending',
          check_in_deadline  = CASE
            WHEN (v_is_player1 AND player2_id IS NOT NULL)
              OR (NOT v_is_player1 AND player1_id IS NOT NULL)
            THEN now() + interval '5 minutes'
            ELSE check_in_deadline
          END
        WHERE id = v_existing_id;
      ELSE
        INSERT INTO match_results (
          tournament_id, match_id, round,
          player1_id, player2_id,
          status, check_in_deadline
        )
        VALUES (
          NEW.tournament_id, v_next_match_id, v_next_round,
          CASE WHEN v_is_player1 THEN NEW.winner_id ELSE NULL END,
          CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE NULL END,
          'pending', NULL
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
-- ============================================================
-- Migration: 00080_definitive_fix.sql
-- ============================================================

-- ============================================================
-- ROOT CAUSE CONFIRMED:
--   In tournament_completion.sql, distribute_arena_prizes()
--   at line 186-188 runs this with NO WHERE CLAUSE:
--
--     UPDATE platform_settings
--     SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;
--
--   Every time a tournament completes, handle_tournament_status_change
--   calls distribute_arena_prizes, which hits this bare UPDATE and
--   throws error code 21000. This is the error that has been
--   appearing on every result submission and admin override.
--
--   Additionally check_for_tournament_completion still uses
--   max_players - 1 to count matches, which was broken from
--   the start for non-power-of-2 player counts.
-- ============================================================

-- ============================================================
-- FIX 1: Replace distribute_arena_prizes with WHERE clause
-- ============================================================
CREATE OR REPLACE FUNCTION public.distribute_arena_prizes(
  p_tournament_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament        record;
  v_platform_fee      numeric;
  v_net_prize         numeric;
  v_total_entry_fees  numeric;
  v_winner_id         uuid;
BEGIN
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Prevent double distribution
  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize    := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;

  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id;

  -- Find winner from the final confirmed match
  SELECT winner_id INTO v_winner_id
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND status = 'confirmed'
  ORDER BY round DESC, created_at DESC
  LIMIT 1;

  -- Pay winner
  IF v_winner_id IS NOT NULL AND v_net_prize > 0 THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_net_prize,
      available_balance = COALESCE(available_balance, 0) + v_net_prize
    WHERE id = v_winner_id;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_winner_id, 'payout', v_net_prize,
      'Tournament prize for winning: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- Pay creator entry fees
  IF v_total_entry_fees > 0 THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_total_entry_fees,
      available_balance = COALESCE(available_balance, 0) + v_total_entry_fees
    WHERE id = v_tournament.created_by;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 'payout', v_total_entry_fees,
      'Entry fees collected for tournament: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- THE FIX: Add WHERE clause — this was the bare UPDATE causing error 21000
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);

  -- Mark as distributed
  UPDATE tournaments
  SET prizes_distributed = true
  WHERE id = p_tournament_id;
END;
$$;

-- ============================================================
-- FIX 2: Replace check_for_tournament_completion
-- Old version used max_players - 1 which breaks for any
-- tournament where actual participants != max_players.
-- New version checks if the final match specifically is confirmed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_for_tournament_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_round   integer;
  v_final_match text;
BEGIN
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
  THEN
    -- Final match is always the highest round, match index 0
    SELECT MAX(round) INTO v_max_round
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    v_final_match := 'r' || v_max_round || '-m0';

    -- Only complete the tournament if THIS match is the final
    IF NEW.match_id = v_final_match AND NEW.winner_id IS NOT NULL THEN
      UPDATE tournaments
      SET
        status    = 'completed',
        winner_id = NEW.winner_id
      WHERE id = NEW.tournament_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_tournament_completion ON match_results;
CREATE TRIGGER trigger_check_tournament_completion
  AFTER UPDATE OF status
  ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION check_for_tournament_completion();

-- ============================================================
-- FIX 3: Drop and recreate trigger_advance_winner as
-- UPDATE ONLY — the live database still has it firing on
-- both INSERT and UPDATE despite previous migration attempts.
-- ============================================================
DROP TRIGGER IF EXISTS trigger_advance_winner ON match_results;
CREATE TRIGGER trigger_advance_winner
  AFTER UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION advance_winner_to_next_match();
-- ============================================================
-- Migration: 00081_assign_breath_taking_avatars.sql
-- ============================================================

-- Create a function to get a random breath-taking avatar
CREATE OR REPLACE FUNCTION public.get_random_breath_taking_avatar()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    avatars text[] := ARRAY[
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_26dad928-74a6-44f7-b8d4-e1cf0059b2e6.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_a2d80bca-adac-4a3a-9e0e-a9694bf32ba5.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f1daa62c-38d1-48bf-a619-04f491ce2bf3.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_82912364-b864-4846-89b7-ecdc85dc1225.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b5cfbf67-3067-46c6-b2cc-5c4fbea7d600.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d1e487b5-bd84-4413-a5c3-598538f08712.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_a171edef-e734-4b43-b7cd-b0bb5f46c3fb.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d258695d-e03f-48ee-bffe-769d2f2a08fc.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_27659b40-fd1e-4d05-915b-513498f65e6c.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_38f6059d-b78e-4cc6-9505-7e868e703866.jpg'
    ];
BEGIN
    RETURN avatars[floor(random() * array_length(avatars, 1) + 1)];
END;
$$;

-- Create a function to handle the trigger for new profiles
CREATE OR REPLACE FUNCTION public.handle_new_profile_avatar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.avatar_url IS NULL OR NEW.avatar_url = '' THEN
        NEW.avatar_url := public.get_random_breath_taking_avatar();
    END IF;
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_on_profile_avatar_insert ON public.profiles;
CREATE TRIGGER tr_on_profile_avatar_insert
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_profile_avatar();

-- Update existing profiles that don't have an avatar
UPDATE public.profiles
SET avatar_url = public.get_random_breath_taking_avatar()
WHERE avatar_url IS NULL OR avatar_url = '';

-- ============================================================
-- Migration: 00082_challenge_prize_distribution.sql
-- ============================================================

-- Create function to distribute prizes for completed challenges
CREATE OR REPLACE FUNCTION distribute_challenge_prizes(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge record;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Prevent double distribution
  -- We'll use completed_at as a proxy or just check if it's already completed
  -- Actually this function will be called when status transitions to completed
  
  IF v_challenge.status != 'completed' OR v_challenge.winner_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if already distributed (we might need a flag, but for now we'll check transactions)
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'payout') THEN
    RETURN;
  END IF;

  -- Add prize pool to winner
  UPDATE profiles
  SET 
    arena_currency = COALESCE(arena_currency, 0) + v_challenge.prize_pool,
    available_balance = COALESCE(available_balance, 0) + v_challenge.prize_pool
  WHERE id = v_challenge.winner_id;

  -- Record transaction for winner
  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
  VALUES (
    v_challenge.winner_id, 
    'payout', 
    v_challenge.prize_pool, 
    'Quick Match prize for winning: ' || v_challenge.game, 
    'completed', 
    p_challenge_id
  );

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_challenge.platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);

END;
$$;

-- Update handle_challenge_completion to call distribute_challenge_prizes
CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run if status is accepted or disputed
  IF NEW.status IN ('accepted', 'disputed') THEN
    
    -- Check if both players have reported and they agree
    IF NEW.challenger_reported_winner IS NOT NULL 
       AND NEW.opponent_reported_winner IS NOT NULL 
       AND NEW.challenger_reported_winner = NEW.opponent_reported_winner
    THEN
      -- Agreement reached
      NEW.status := 'completed';
      NEW.winner_id := NEW.challenger_reported_winner;
      NEW.completed_at := now();
      
      -- We'll use an AFTER trigger for prize distribution to avoid nested transaction issues if any
    
    -- Check if both have reported but they disagree
    ELSIF NEW.challenger_reported_winner IS NOT NULL 
          AND NEW.opponent_reported_winner IS NOT NULL 
          AND NEW.challenger_reported_winner != NEW.opponent_reported_winner
    THEN
      -- Conflict -> Dispute
      NEW.status := 'disputed';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Create AFTER trigger for prize distribution
CREATE OR REPLACE FUNCTION trigger_distribute_challenge_prizes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM distribute_challenge_prizes(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_challenge_prize_distribution ON challenges;
CREATE TRIGGER trigger_challenge_prize_distribution
  AFTER UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_distribute_challenge_prizes();

-- ============================================================
-- Migration: 00083_challenge_auto_resolve_and_admin_rls.sql
-- ============================================================

-- 1. Update expire_old_challenges to handle check-in failures and award prizes
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle pending challenges (expired)
  UPDATE challenges
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();

  -- Handle accepted challenges where check-in deadline has passed
  -- Scenario A: Challenger checked in, Opponent didn't -> Challenger wins
  UPDATE challenges
  SET status = 'completed',
      winner_id = challenger_id,
      completed_at = now(),
      updated_at = now()
  WHERE status = 'accepted'
    AND check_in_deadline < now()
    AND challenger_checked_in = true
    AND opponent_checked_in = false;

  -- Scenario B: Opponent checked in, Challenger didn't -> Opponent wins
  UPDATE challenges
  SET status = 'completed',
      winner_id = opponent_id,
      completed_at = now(),
      updated_at = now()
  WHERE status = 'accepted'
    AND check_in_deadline < now()
    AND challenger_checked_in = false
    AND opponent_checked_in = true;

  -- Scenario C: Neither checked in -> Cancel/Refund
  UPDATE challenges
  SET status = 'cancelled',
      updated_at = now()
  WHERE status = 'accepted'
    AND check_in_deadline < now()
    AND challenger_checked_in = false
    AND opponent_checked_in = false;
END;
$$;

-- 2. Add RLS policy for admins to manage all challenges
DROP POLICY IF EXISTS "Admins can manage all challenges" ON challenges;
CREATE POLICY "Admins can manage all challenges"
  ON challenges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Ensure maintenance task also runs periodically via RPC if needed
-- (Though typically we call this from the frontend on key pages)

-- ============================================================
-- Migration: 00084_add_rating_and_dispute_tracking.sql
-- ============================================================

-- Add rating field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rating NUMERIC(4,2) DEFAULT 5.0 NOT NULL;

-- Add dispute tracking fields to challenges table
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS dispute_warning_shown BOOLEAN DEFAULT false;

-- Create function to handle Quick Match result submission
CREATE OR REPLACE FUNCTION handle_quick_match_result()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_report uuid;
  v_opponent_report uuid;
  v_dispute_count integer;
BEGIN
  -- Get current reports
  v_challenger_report := NEW.challenger_reported_winner;
  v_opponent_report := NEW.opponent_reported_winner;
  v_dispute_count := COALESCE(NEW.dispute_count, 0);

  -- Check if both players have reported
  IF v_challenger_report IS NOT NULL AND v_opponent_report IS NOT NULL THEN
    
    -- Case 1: Both agree on winner
    IF v_challenger_report = v_opponent_report THEN
      NEW.status := 'completed';
      NEW.winner_id := v_challenger_report;
      NEW.completed_at := now();
      
      -- Increase winner's rating by 0.1
      UPDATE profiles
      SET rating = LEAST(rating + 0.1, 10.0)
      WHERE id = v_challenger_report;
      
    -- Case 2: Disagreement (dispute)
    ELSE
      -- First dispute: Set warning status
      IF v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        -- Clear reports to allow resubmission
        NEW.challenger_reported_winner := NULL;
        NEW.opponent_reported_winner := NULL;
        
      -- Second dispute: Cancel match and reduce ratings
      ELSE
        NEW.status := 'cancelled';
        NEW.completed_at := now();
        NEW.dispute_count := 2;
        
        -- Reduce both players' ratings by 0.5
        UPDATE profiles
        SET rating = GREATEST(rating - 0.5, 0.0)
        WHERE id IN (NEW.challenger_id, NEW.opponent_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for Quick Match result handling
DROP TRIGGER IF EXISTS trigger_handle_quick_match_result ON challenges;
CREATE TRIGGER trigger_handle_quick_match_result
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  WHEN (NEW.challenger_reported_winner IS DISTINCT FROM OLD.challenger_reported_winner 
    OR NEW.opponent_reported_winner IS DISTINCT FROM OLD.opponent_reported_winner)
  EXECUTE FUNCTION handle_quick_match_result();
-- ============================================================
-- Migration: 00085_update_challenge_refund_for_cancelled_disputes.sql
-- ============================================================

-- Update refund trigger to handle cancelled disputes
CREATE OR REPLACE FUNCTION handle_challenge_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- If challenge is declined, expired, or cancelled (including dispute cancellations), refund both players
  IF (OLD.status != NEW.status) AND (NEW.status IN ('declined', 'expired', 'cancelled')) THEN
    
    -- Refund challenger if they paid stake
    IF OLD.stake_amount > 0 AND OLD.status != 'pending' THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.challenger_id;

      INSERT INTO transactions (user_id, type, amount, description, status, metadata)
      VALUES (
        OLD.challenger_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'declined' THEN 'Challenge declined by opponent'
          WHEN NEW.status = 'expired' THEN 'Challenge expired without response'
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 2 THEN 'Match cancelled due to repeated disputes'
          ELSE 'Match cancelled'
        END,
        'completed',
        jsonb_build_object('challenge_id', OLD.id)
      );
    END IF;

    -- Refund opponent if they paid stake (for accepted/active matches)
    IF OLD.stake_amount > 0 AND OLD.status IN ('accepted', 'disputed', 'disputed_warning') THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.opponent_id;

      INSERT INTO transactions (user_id, type, amount, description, status, metadata)
      VALUES (
        OLD.opponent_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 2 THEN 'Match cancelled due to repeated disputes'
          ELSE 'Match cancelled'
        END,
        'completed',
        jsonb_build_object('challenge_id', OLD.id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================
-- Migration: 00086_reset_balances_and_clear_challenges.sql
-- ============================================================

-- 1. Cancel all active challenges to prevent escrow issues
UPDATE challenges 
SET status = 'cancelled',
    updated_at = NOW()
WHERE status NOT IN ('completed', 'cancelled', 'declined', 'expired');

-- 2. Reset all existing users' balances to 5000
UPDATE profiles 
SET arena_currency = 5000, 
    available_balance = 5000, 
    pending_balance = 0,
    updated_at = NOW();

-- 3. Change default balance for new members to 5000
ALTER TABLE profiles 
ALTER COLUMN arena_currency SET DEFAULT 5000;

ALTER TABLE profiles 
ALTER COLUMN available_balance SET DEFAULT 5000;

-- 4. Clean up any stuck transactions (optional but recommended for a clean state)
UPDATE transactions 
SET status = 'cancelled'
WHERE status = 'pending';
-- ============================================================
-- Migration: 00087_fix_challenge_rls_for_disputed_warning.sql
-- ============================================================

-- Update RLS policy to allow participants to update challenges in 'disputed_warning' status
DROP POLICY IF EXISTS "Participants can update live challenges" ON challenges;

CREATE POLICY "Participants can update live challenges" ON challenges
FOR UPDATE TO authenticated
USING (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND 
  status IN ('accepted', 'disputed', 'disputed_warning')
)
WITH CHECK (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND
  auth.uid() = submitted_by
);

-- Also ensure that we can update the status to completed or cancelled
-- The existing policy might be too restrictive on what columns can be updated.
-- But since we are using a trigger to handle the status change, the user only needs to be able to update their report field.

-- ============================================================
-- Migration: 00088_consolidate_challenge_triggers_v2.sql
-- ============================================================

-- Drop the conflicting triggers
DROP TRIGGER IF EXISTS trigger_handle_challenge_completion ON challenges;
DROP TRIGGER IF EXISTS trigger_handle_quick_match_result ON challenges;

-- Define a unified handler for challenge results
CREATE OR REPLACE FUNCTION handle_challenge_result_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_report uuid;
  v_opponent_report uuid;
  v_dispute_count integer;
BEGIN
  -- Get current reports
  v_challenger_report := NEW.challenger_reported_winner;
  v_opponent_report := NEW.opponent_reported_winner;
  v_dispute_count := COALESCE(NEW.dispute_count, 0);

  -- Only handle matches that are in relevant statuses
  IF NEW.status NOT IN ('accepted', 'disputed', 'disputed_warning') THEN
    RETURN NEW;
  END IF;

  -- Check if both players have reported
  IF v_challenger_report IS NOT NULL AND v_opponent_report IS NOT NULL THEN
    
    -- Case 1: Both agree on winner
    IF v_challenger_report = v_opponent_report THEN
      NEW.status := 'completed';
      NEW.winner_id := v_challenger_report;
      NEW.completed_at := now();
      
      -- Increase winner's rating by 0.1
      UPDATE profiles
      SET rating = LEAST(rating + 0.1, 10.0)
      WHERE id = v_challenger_report;
      
    -- Case 2: Disagreement (dispute)
    ELSE
      -- First dispute: Set warning status and clear reports for resubmission
      IF v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        
        -- We clear these so the UI shows they need to report again
        -- AND to allow the WHEN condition of the trigger to fire again on resubmission
        NEW.challenger_reported_winner := NULL;
        NEW.opponent_reported_winner := NULL;
        
      -- Second dispute: Auto-cancel match, refund, and reduce ratings
      ELSE
        NEW.status := 'cancelled';
        NEW.completed_at := now();
        NEW.dispute_count := 2;
        
        -- Reduce both players' ratings by 0.5
        UPDATE profiles
        SET rating = GREATEST(rating - 0.5, 0.0)
        WHERE id IN (NEW.challenger_id, NEW.opponent_id);
        
        -- Note: handle_challenge_refund trigger will handle the actual money transfer
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger with a clean name and consolidated logic
CREATE TRIGGER trigger_handle_challenge_result
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  WHEN (NEW.challenger_reported_winner IS DISTINCT FROM OLD.challenger_reported_winner 
    OR NEW.opponent_reported_winner IS DISTINCT FROM OLD.opponent_reported_winner)
  EXECUTE FUNCTION handle_challenge_result_v2();

-- ============================================================
-- Migration: 00089_fix_challenge_rls_final_check.sql
-- ============================================================

-- Update RLS policy to allow participants to transition challenges to completed/cancelled
DROP POLICY IF EXISTS "Participants can update live challenges" ON challenges;

CREATE POLICY "Participants can update live challenges" ON challenges
FOR UPDATE TO authenticated
USING (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND 
  status IN ('accepted', 'disputed', 'disputed_warning')
)
WITH CHECK (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND
  auth.uid() = submitted_by AND
  status IN ('accepted', 'disputed', 'disputed_warning', 'completed', 'cancelled')
);

-- ============================================================
-- Migration: 00090_fix_transaction_challenge_id_and_distribution_v2.sql
-- ============================================================

-- Add challenge_id column to transactions table for better tracking
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES challenges(id);

-- Update the distribution function to use the correct columns
CREATE OR REPLACE FUNCTION distribute_challenge_prizes(p_challenge_id UUID)
RETURNS VOID AS $$
DECLARE
  v_challenge record;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only distribute if match is completed and winner is set
  IF v_challenge.status != 'completed' OR v_challenge.winner_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if already distributed to avoid double payment
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'payout') THEN
    RETURN;
  END IF;

  -- Add prize pool to winner
  UPDATE profiles
  SET 
    arena_currency = COALESCE(arena_currency, 0) + v_challenge.prize_pool,
    available_balance = COALESCE(available_balance, 0) + v_challenge.prize_pool,
    total_earnings = COALESCE(total_earnings, 0) + v_challenge.prize_pool,
    wins = COALESCE(wins, 0) + 1
  WHERE id = v_challenge.winner_id;

  -- Increment losses for the opponent
  UPDATE profiles
  SET 
    losses = COALESCE(losses, 0) + 1
  WHERE id = CASE 
    WHEN v_challenge.winner_id = v_challenge.challenger_id THEN v_challenge.opponent_id 
    ELSE v_challenge.challenger_id 
  END;

  -- Record transaction for winner
  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
  VALUES (
    v_challenge.winner_id, 
    'payout', 
    v_challenge.prize_pool, 
    'Quick Match prize for winning: ' || v_challenge.game, 
    'completed', 
    p_challenge_id
  );

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_challenge.platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the refund function to use the challenge_id column as well
CREATE OR REPLACE FUNCTION handle_challenge_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- If challenge is declined, expired, or cancelled (including dispute cancellations), refund both players
  IF (OLD.status != NEW.status) AND (NEW.status IN ('declined', 'expired', 'cancelled')) THEN
    
    -- Refund challenger if they paid stake
    IF OLD.stake_amount > 0 AND OLD.status != 'pending' THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.challenger_id;

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
      VALUES (
        OLD.challenger_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'declined' THEN 'Challenge declined by opponent'
          WHEN NEW.status = 'expired' THEN 'Challenge expired without response'
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 2 THEN 'Match cancelled due to repeated disputes'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;

    -- Refund opponent if they paid stake (for accepted/active matches)
    IF OLD.stake_amount > 0 AND OLD.status IN ('accepted', 'disputed', 'disputed_warning') THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.opponent_id;

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
      VALUES (
        OLD.opponent_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 2 THEN 'Match cancelled due to repeated disputes'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Migration: 00091_refine_quick_match_dispute_system_v3.sql
-- ============================================================

-- 1. Update the consolidated trigger function for challenge results
CREATE OR REPLACE FUNCTION handle_challenge_result_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_report uuid;
  v_opponent_report uuid;
  v_dispute_count integer;
  v_system_msg text;
BEGIN
  -- Get current reports
  v_challenger_report := NEW.challenger_reported_winner;
  v_opponent_report := NEW.opponent_reported_winner;
  v_dispute_count := COALESCE(NEW.dispute_count, 0);

  -- Only handle matches that are in relevant statuses
  IF NEW.status NOT IN ('accepted', 'disputed', 'disputed_warning') THEN
    RETURN NEW;
  END IF;

  -- Check if both players have reported
  IF v_challenger_report IS NOT NULL AND v_opponent_report IS NOT NULL THEN
    
    -- Case 1: Both agree on winner
    IF v_challenger_report = v_opponent_report THEN
      NEW.status := 'completed';
      NEW.winner_id := v_challenger_report;
      NEW.completed_at := now();
      
      -- Increase winner's rating by 0.1
      UPDATE profiles
      SET rating = LEAST(rating + 0.1, 10.0)
      WHERE id = v_challenger_report;
      
    -- Case 2: Disagreement (dispute)
    ELSE
      -- First dispute: Set warning status, keep reports, and notify in chat
      IF v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        
        -- Insert system message into match_messages
        v_system_msg := '⚠️ Both of you are claiming to be winners. Discuss again on the real winner. If you don''t come to an agreement, you can cancel the match but it will reduce your rating scores by 0.5. You can change your report until the timer ends.';
        
        INSERT INTO match_messages (challenge_id, user_id, message, is_system_message)
        VALUES (NEW.id, '00000000-0000-0000-0000-000000000000'::uuid, v_system_msg, true);
        
      -- We no longer auto-cancel here, we allow the players to use the cancel button
      -- OR if they change their reports and still disagree, it stays in disputed_warning
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the refund and rating penalty trigger
CREATE OR REPLACE FUNCTION handle_challenge_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- If challenge is declined, expired, or cancelled
  IF (OLD.status != NEW.status) AND (NEW.status IN ('declined', 'expired', 'cancelled')) THEN
    
    -- Rating penalty for cancelled matches that had a dispute
    IF NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN
      UPDATE profiles
      SET rating = GREATEST(rating - 0.5, 0.0)
      WHERE id IN (NEW.challenger_id, NEW.opponent_id);
    END IF;

    -- Refund challenger if they paid stake
    IF OLD.stake_amount > 0 AND OLD.status != 'pending' THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.challenger_id;

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
      VALUES (
        OLD.challenger_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'declined' THEN 'Challenge declined by opponent'
          WHEN NEW.status = 'expired' THEN 'Challenge expired without response'
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN 'Match cancelled due to dispute'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;

    -- Refund opponent if they paid stake
    IF OLD.stake_amount > 0 AND OLD.status IN ('accepted', 'disputed', 'disputed_warning') THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.opponent_id;

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
      VALUES (
        OLD.opponent_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN 'Match cancelled due to dispute'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Migration: 00092_perfect_dispute_system_v4_manual_cancel_and_chat.sql
-- ============================================================

-- 1. Update the consolidated trigger function for challenge results
CREATE OR REPLACE FUNCTION handle_challenge_result_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_report uuid;
  v_opponent_report uuid;
  v_dispute_count integer;
  v_system_msg text;
BEGIN
  -- Get current reports
  v_challenger_report := NEW.challenger_reported_winner;
  v_opponent_report := NEW.opponent_reported_winner;
  v_dispute_count := COALESCE(NEW.dispute_count, 0);

  -- Only handle matches that are in relevant statuses
  IF NEW.status NOT IN ('accepted', 'disputed', 'disputed_warning') THEN
    RETURN NEW;
  END IF;

  -- Check if both players have reported
  IF v_challenger_report IS NOT NULL AND v_opponent_report IS NOT NULL THEN
    
    -- Case 1: Both agree on winner
    IF v_challenger_report = v_opponent_report THEN
      NEW.status := 'completed';
      NEW.winner_id := v_challenger_report;
      NEW.completed_at := now();
      
      -- Increase winner's rating by 0.1
      UPDATE profiles
      SET rating = LEAST(rating + 0.1, 10.0)
      WHERE id = v_challenger_report;
      
    -- Case 2: Disagreement (dispute)
    ELSE
      -- If it's the first time they disagree, set warning status and notify
      IF NEW.status != 'disputed_warning' AND v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        
        -- Insert system message into match_messages
        v_system_msg := '⚠️ Both of you are claiming to be winners. Discuss again on the real winner. If you don''t come to an agreement, you can cancel the match but it will reduce your rating scores by 0.5. You can change your report until the timer ends.';
        
        INSERT INTO match_messages (challenge_id, user_id, message, is_system_message)
        VALUES (NEW.id, NULL, v_system_msg, true);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure RLS is permissive enough for disputes and manual cancellations
DROP POLICY IF EXISTS "Participants can update live challenges" ON challenges;

CREATE POLICY "Participants can update live challenges" ON challenges
FOR UPDATE TO authenticated
USING (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND 
  status IN ('accepted', 'disputed', 'disputed_warning')
)
WITH CHECK (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND
  auth.uid() = submitted_by
);

-- Note: We removed the status check in WITH CHECK to allow the trigger to change status freely
-- during the update, and to allow users to set 'cancelled' manually.

-- ============================================================
-- Migration: 00093_update_challenge_status_constraint_to_include_disputed_warning.sql
-- ============================================================

-- Drop the existing status check constraint
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_status_check;

-- Create the updated status check constraint including 'disputed_warning'
ALTER TABLE challenges ADD CONSTRAINT challenges_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text, 'completed'::text, 'cancelled'::text, 'disputed'::text, 'disputed_warning'::text]));

-- ============================================================
-- Migration: 00094_finalize_earnings_and_rating_logic.sql
-- ============================================================

-- 1. Update distribute_challenge_prizes to ensure total_earnings is updated
CREATE OR REPLACE FUNCTION distribute_challenge_prizes(p_challenge_id UUID)
RETURNS VOID AS $$
DECLARE
  v_challenge record;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only distribute if match is completed and winner is set
  IF v_challenge.status != 'completed' OR v_challenge.winner_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if already distributed to avoid double payment
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'payout') THEN
    RETURN;
  END IF;

  -- Add prize pool to winner
  UPDATE profiles
  SET 
    arena_currency = COALESCE(arena_currency, 0) + v_challenge.prize_pool,
    available_balance = COALESCE(available_balance, 0) + v_challenge.prize_pool,
    total_earnings = COALESCE(total_earnings, 0) + v_challenge.prize_pool,
    wins = COALESCE(wins, 0) + 1
  WHERE id = v_challenge.winner_id;

  -- Increment losses for the opponent
  UPDATE profiles
  SET 
    losses = COALESCE(losses, 0) + 1
  WHERE id = CASE 
    WHEN v_challenge.winner_id = v_challenge.challenger_id THEN v_challenge.opponent_id 
    ELSE v_challenge.challenger_id 
  END;

  -- Record transaction for winner
  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
  VALUES (
    v_challenge.winner_id, 
    'payout', 
    v_challenge.prize_pool, 
    'Quick Match prize for winning: ' || v_challenge.game, 
    'completed', 
    p_challenge_id
  );

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_challenge.platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update handle_challenge_result_v2 to ensure rating cap
CREATE OR REPLACE FUNCTION handle_challenge_result_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_report uuid;
  v_opponent_report uuid;
  v_dispute_count integer;
  v_system_msg text;
BEGIN
  -- Get current reports
  v_challenger_report := NEW.challenger_reported_winner;
  v_opponent_report := NEW.opponent_reported_winner;
  v_dispute_count := COALESCE(NEW.dispute_count, 0);

  -- Only handle matches that are in relevant statuses
  IF NEW.status NOT IN ('accepted', 'disputed', 'disputed_warning') THEN
    RETURN NEW;
  END IF;

  -- Check if both players have reported
  IF v_challenger_report IS NOT NULL AND v_opponent_report IS NOT NULL THEN
    
    -- Case 1: Both agree on winner
    IF v_challenger_report = v_opponent_report THEN
      NEW.status := 'completed';
      NEW.winner_id := v_challenger_report;
      NEW.completed_at := now();
      
      -- Increase winner's rating by 0.1, capped at 10.0
      UPDATE profiles
      SET rating = LEAST(rating + 0.1, 10.0)
      WHERE id = v_challenger_report;
      
    -- Case 2: Disagreement (dispute)
    ELSE
      -- If it's the first time they disagree, set warning status and notify
      IF NEW.status != 'disputed_warning' AND v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        
        -- Insert system message into match_messages
        v_system_msg := '⚠️ Both of you are claiming to be winners. Discuss again on the real winner. If you don''t come to an agreement, you can cancel the match but it will reduce your rating scores by 0.5. You can change your report until the timer ends.';
        
        INSERT INTO match_messages (challenge_id, user_id, message, is_system_message)
        VALUES (NEW.id, NULL, v_system_msg, true);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update complete_tournament_flow to include total_earnings and rating boost
CREATE OR REPLACE FUNCTION complete_tournament_flow(p_tournament_id uuid, p_winner_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_tournament record;
  v_winner record;
  v_runner_up record;
  v_platform_fee numeric;
  v_net_prize numeric;
  v_total_entry_fees numeric;
  v_creator_cut numeric;
  v_participant_count integer;
  v_tournament_duration interval;
  v_result jsonb;
BEGIN
  -- Step 1: Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Prevent double execution
  IF v_tournament.status = 'completed' AND v_tournament.prizes_distributed = true THEN
    RAISE NOTICE 'Tournament already completed and prizes distributed';
    RETURN jsonb_build_object('success', false, 'message', 'Already completed');
  END IF;

  -- Step 2: Update tournament status
  UPDATE tournaments 
  SET 
    status = 'completed',
    winner_id = p_winner_id,
    ended_at = NOW()
  WHERE id = p_tournament_id;

  RAISE NOTICE 'Step 2: Tournament status updated to completed';

  -- Get updated tournament with ended_at
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  -- Calculate tournament duration
  IF v_tournament.started_at IS NOT NULL THEN
    v_tournament_duration := v_tournament.ended_at - v_tournament.started_at;
  ELSE
    v_tournament_duration := interval '0';
  END IF;

  -- Get winner details
  SELECT id, gamertag, avatar_url INTO v_winner 
  FROM profiles WHERE id = p_winner_id;

  -- Get runner-up (loser of final match)
  SELECT p.id, p.gamertag, p.avatar_url INTO v_runner_up
  FROM match_results mr
  JOIN profiles p ON (p.id = mr.player1_id OR p.id = mr.player2_id) AND p.id != p_winner_id
  WHERE mr.tournament_id = p_tournament_id 
    AND mr.status = 'confirmed'
  ORDER BY mr.round DESC
  LIMIT 1;

  -- Count participants
  SELECT COUNT(*) INTO v_participant_count 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;

  -- Step 3: Distribute prize pool to winner
  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;

  IF v_net_prize > 0 THEN
    UPDATE profiles
    SET 
      arena_currency = COALESCE(arena_currency, 0) + v_net_prize,
      available_balance = COALESCE(available_balance, 0) + v_net_prize,
      total_earnings = COALESCE(total_earnings, 0) + v_net_prize,
      rating = LEAST(rating + 0.5, 10.0) -- Significant rating boost for tournament win
    WHERE id = p_winner_id;
    
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      p_winner_id, 
      'payout', 
      v_net_prize, 
      'Tournament prize for winning: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );

    RAISE NOTICE 'Step 3: Prize pool distributed to winner: %', v_net_prize;
  END IF;

  -- Step 4: Send entry fees to tournament creator (10% of total entry fees)
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;

  v_creator_cut := v_total_entry_fees * 0.10;

  IF v_creator_cut > 0 THEN
    UPDATE profiles
    SET 
      arena_currency = COALESCE(arena_currency, 0) + v_creator_cut,
      available_balance = COALESCE(available_balance, 0) + v_creator_cut
    WHERE id = v_tournament.created_by;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 
      'payout', 
      v_creator_cut, 
      'Creator fee (10%) for tournament: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );

    RAISE NOTICE 'Step 4: Creator fee sent: %', v_creator_cut;
  END IF;

  -- Add platform fee to maintenance balance
  IF v_platform_fee > 0 THEN
    UPDATE platform_settings
    SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;
  END IF;

  -- Step 7: Send completion notifications
  -- Winner notification
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    p_winner_id,
    '🏆 You are the Arena Champion!',
    'A$' || v_net_prize || ' Arena Coins added to your wallet',
    'tournament',
    '/wallet'
  );

  -- All other participants notification
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT 
    user_id,
    'Tournament Ended',
    'Well played! Check the leaderboard for results.',
    'tournament',
    '/tournaments/' || p_tournament_id
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id AND user_id != p_winner_id;

  RAISE NOTICE 'Step 7: Notifications sent to all participants';

  -- Step 8: Update leaderboard stats
  -- Increment tournaments_played for all participants
  UPDATE profiles
  SET tournaments_played = COALESCE(tournaments_played, 0) + 1
  WHERE id IN (
    SELECT user_id FROM tournament_participants WHERE tournament_id = p_tournament_id
  );

  -- Increment tournaments_won for winner
  UPDATE profiles
  SET tournaments_won = COALESCE(tournaments_won, 0) + 1
  WHERE id = p_winner_id;

  -- Update win_rate for all participants
  UPDATE profiles
  SET win_rate = CASE 
    WHEN COALESCE(tournaments_played, 0) > 0 
    THEN (COALESCE(tournaments_won, 0)::numeric / COALESCE(tournaments_played, 0)::numeric) * 100
    ELSE 0
  END
  WHERE id IN (
    SELECT user_id FROM tournament_participants WHERE tournament_id = p_tournament_id
  );

  RAISE NOTICE 'Step 8: Leaderboard stats updated';

  -- Mark prizes as distributed
  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;

  -- Build result payload for Realtime broadcast
  v_result := jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'winner_id', p_winner_id,
    'winner_username', v_winner.gamertag,
    'winner_avatar', v_winner.avatar_url,
    'prize_amount', v_net_prize,
    'runner_up_id', v_runner_up.id,
    'runner_up_username', v_runner_up.gamertag,
    'tournament_name', v_tournament.name,
    'total_participants', v_participant_count,
    'tournament_duration', EXTRACT(EPOCH FROM v_tournament_duration)::integer
  );

  RAISE NOTICE 'Tournament completion flow finished successfully';
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Migration: 00095_fix_challenge_refund_logic.sql
-- ============================================================

CREATE OR REPLACE FUNCTION handle_challenge_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- If challenge status changes to a terminal/non-playable status that requires a refund
  IF (OLD.status != NEW.status) AND (NEW.status IN ('declined', 'expired', 'cancelled')) THEN
    
    -- Rating penalty for cancelled matches that had a dispute
    IF NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN
      UPDATE profiles
      SET rating = GREATEST(rating - 0.5, 0.0)
      WHERE id IN (NEW.challenger_id, NEW.opponent_id);
    END IF;

    -- Refund challenger if they paid stake (Challenger pays when creating, i.e., in 'pending' status)
    IF OLD.stake_amount > 0 AND OLD.status IN ('pending', 'accepted', 'disputed', 'disputed_warning') THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.challenger_id;

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
      VALUES (
        OLD.challenger_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'declined' THEN 'Challenge declined by opponent'
          WHEN NEW.status = 'expired' THEN 'Challenge expired without response'
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN 'Match cancelled due to dispute'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;

    -- Refund opponent if they paid stake (Opponent pays when they accept, so status must have been 'accepted' or more)
    IF OLD.stake_amount > 0 AND OLD.status IN ('accepted', 'disputed', 'disputed_warning') THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.opponent_id;

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
      VALUES (
        OLD.opponent_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN 'Match cancelled due to dispute'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================
-- Migration: 00096_standardize_transaction_types_and_balances_v2.sql
-- ============================================================

-- Update distribute_arena_prizes (the one called with tournament ID)
CREATE OR REPLACE FUNCTION distribute_arena_prizes(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament        record;
  v_platform_fee      numeric;
  v_net_prize         numeric;
  v_total_entry_fees  numeric;
  v_winner_id         uuid;
  v_participant       record;
  v_participant_count integer;
BEGIN

  -- Get tournament details
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Prevent double distribution
  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  -- Calculate fees
  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize    := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;

  -- Calculate total entry fees
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id;

  -- Find winner from the final confirmed match
  v_winner_id := v_tournament.winner_id;

  -- Fallback: find from match_results if not set on tournament
  IF v_winner_id IS NULL THEN
    SELECT winner_id INTO v_winner_id
    FROM match_results
    WHERE tournament_id = p_tournament_id
      AND status = 'confirmed'
    ORDER BY round DESC, created_at DESC
    LIMIT 1;
  END IF;

  -- ── Pay winner ───────────────────────────────────────────
  IF v_winner_id IS NOT NULL AND v_net_prize > 0 THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_net_prize,
      available_balance = COALESCE(available_balance, 0) + v_net_prize,
      total_earnings    = COALESCE(total_earnings, 0) + v_net_prize,
      tournaments_won   = COALESCE(tournaments_won, 0) + 1
    WHERE id = v_winner_id;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_winner_id, 'tournament_win', v_net_prize,
      'Tournament prize for winning: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- ── Pay creator entry fees (if tournament has entry fee) ───────────────
  IF v_total_entry_fees > 0 AND v_tournament.created_by IS NOT NULL THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_total_entry_fees,
      available_balance = COALESCE(available_balance, 0) + v_total_entry_fees
    WHERE id = v_tournament.created_by;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 'payout', v_total_entry_fees,
      'Entry fees collected for tournament: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- ── Platform fee ─────────────────────────────────────────
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);

  -- ── Update stats for ALL participants ────────────────────
  FOR v_participant IN
    SELECT tp.user_id
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
  LOOP

    IF v_participant.user_id = v_winner_id THEN
      -- Winner stats update
      UPDATE profiles
      SET
        wins                = COALESCE(wins, 0) + 1,
        tournaments_played  = COALESCE(tournaments_played, 0) + 1,
        current_streak      = COALESCE(current_streak, 0) + 1,
        longest_streak      = GREATEST(
                                COALESCE(longest_streak, 0),
                                COALESCE(current_streak, 0) + 1
                              ),
        win_rate            = CASE
                                WHEN (COALESCE(tournaments_played, 0) + 1) > 0
                                THEN ROUND(
                                  ((COALESCE(wins, 0) + 1)::numeric /
                                  (COALESCE(tournaments_played, 0) + 1)::numeric) * 100,
                                  2
                                )
                                ELSE 0
                              END
      WHERE id = v_participant.user_id;
    ELSE
      -- Loser stats update
      UPDATE profiles
      SET
        losses             = COALESCE(losses, 0) + 1,
        tournaments_played = COALESCE(tournaments_played, 0) + 1,
        current_streak     = 0,
        win_rate           = CASE
                               WHEN (COALESCE(tournaments_played, 0) + 1) > 0
                               THEN ROUND(
                                 (COALESCE(wins, 0)::numeric /
                                 (COALESCE(tournaments_played, 0) + 1)::numeric) * 100,
                                 2
                               )
                               ELSE 0
                             END
      WHERE id = v_participant.user_id;
    END IF;
  END LOOP;

  -- ── Mark tournament as distributed ───────────────────────
  UPDATE tournaments
  SET prizes_distributed = true
  WHERE id = p_tournament_id;

END;
$$;

-- Update distribute_challenge_prizes
CREATE OR REPLACE FUNCTION distribute_challenge_prizes(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge record;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only distribute if match is completed and winner is set
  IF v_challenge.status != 'completed' OR v_challenge.winner_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if already distributed to avoid double payment
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'challenge_win') THEN
    RETURN;
  END IF;

  -- Add prize pool to winner
  UPDATE profiles
  SET 
    arena_currency = COALESCE(arena_currency, 0) + v_challenge.prize_pool,
    available_balance = COALESCE(available_balance, 0) + v_challenge.prize_pool,
    total_earnings = COALESCE(total_earnings, 0) + v_challenge.prize_pool,
    wins = COALESCE(wins, 0) + 1
  WHERE id = v_challenge.winner_id;

  -- Increment losses for the opponent
  UPDATE profiles
  SET 
    losses = COALESCE(losses, 0) + 1
  WHERE id = CASE 
    WHEN v_challenge.winner_id = v_challenge.challenger_id THEN v_challenge.opponent_id 
    ELSE v_challenge.challenger_id 
  END;

  -- Record transaction for winner
  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
  VALUES (
    v_challenge.winner_id, 
    'challenge_win', 
    v_challenge.prize_pool, 
    'Quick Match prize for winning: ' || v_challenge.game, 
    'completed', 
    p_challenge_id
  );

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_challenge.platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);
END;
$$;

-- Update existing payout transactions to be more specific
UPDATE transactions SET type = 'tournament_win' WHERE type = 'payout' AND description LIKE 'Tournament%';
UPDATE transactions SET type = 'challenge_win' WHERE type = 'payout' AND description LIKE 'Quick Match%';

-- ============================================================
-- Migration: 00097_fix_tournament_creation_fee_timing_v4_1.sql
-- ============================================================

-- 1. Drop the old BEFORE trigger
DROP TRIGGER IF EXISTS tr_tournament_creation_fee ON tournaments;

-- 2. Update the function (keep it the same logic, but now it will run AFTER)
CREATE OR REPLACE FUNCTION public.handle_tournament_creation_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_balance decimal;
BEGIN
  IF NEW.prize_pool > 0 THEN
    -- Check balance
    SELECT arena_currency INTO v_balance FROM profiles WHERE id = NEW.created_by;
    IF v_balance < NEW.prize_pool THEN
      RAISE EXCEPTION 'Insufficient Arena Currency to create tournament';
    END IF;

    -- Set bypass for profile protection
    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    -- Deduct balance
    UPDATE profiles 
    SET arena_currency = arena_currency - NEW.prize_pool,
        available_balance = available_balance - NEW.prize_pool
    WHERE id = NEW.created_by;
    
    PERFORM set_config('app.bypass_profile_protection', 'false', true);

    -- Record transaction (This now works because NEW.id exists in tournaments table in AFTER trigger)
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (NEW.created_by, 'tournament_fee', -NEW.prize_pool, 'Tournament creation fee: ' || NEW.name, 'completed', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger as AFTER INSERT
CREATE TRIGGER tr_tournament_creation_fee
AFTER INSERT ON tournaments
FOR EACH ROW
EXECUTE FUNCTION handle_tournament_creation_fee();

-- ============================================================
-- Migration: 00098_fix_tournament_join_fee_timing_v4_2.sql
-- ============================================================

-- 1. Drop the old BEFORE trigger
DROP TRIGGER IF EXISTS tr_tournament_join_fee ON tournament_participants;

-- 2. Update the function (keep it the same logic, but now it will run AFTER)
CREATE OR REPLACE FUNCTION public.handle_tournament_join_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_fee decimal;
  v_balance decimal;
  v_tournament_name text;
BEGIN
  SELECT entry_fee, name INTO v_entry_fee, v_tournament_name FROM tournaments WHERE id = NEW.tournament_id;
  IF v_entry_fee > 0 THEN
    SELECT arena_currency INTO v_balance FROM profiles WHERE id = NEW.user_id;
    IF v_balance < v_entry_fee THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Set bypass
    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    UPDATE profiles 
    SET arena_currency = arena_currency - v_entry_fee,
        available_balance = available_balance - v_entry_fee
    WHERE id = NEW.user_id;

    PERFORM set_config('app.bypass_profile_protection', 'false', true);

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (NEW.user_id, 'tournament_fee', -v_entry_fee, 'Entry fee: ' || v_tournament_name, 'completed', NEW.tournament_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger as AFTER INSERT
CREATE TRIGGER tr_tournament_join_fee
AFTER INSERT ON tournament_participants
FOR EACH ROW
EXECUTE FUNCTION handle_tournament_join_fee();

-- ============================================================
-- Migration: 00099_fix_profile_protection_bypass_v5_1.sql
-- ============================================================

-- 1. Update the actual function used by the trigger
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role user_role;
BEGIN
  -- Check for bypass setting
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow updates from the postgres/service role (internal system updates)
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- If not an authenticated session, we might be in an internal process
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the role of the user performing the update
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  -- If not an admin, prevent changing sensitive columns
  IF v_user_role IS DISTINCT FROM 'admin' THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR
       NEW.total_earnings IS DISTINCT FROM OLD.total_earnings OR
       NEW.arena_currency IS DISTINCT FROM OLD.arena_currency OR
       NEW.available_balance IS DISTINCT FROM OLD.available_balance OR
       NEW.pending_balance IS DISTINCT FROM OLD.pending_balance OR
       NEW.wins IS DISTINCT FROM OLD.wins OR
       NEW.losses IS DISTINCT FROM OLD.losses OR
       NEW.win_rate IS DISTINCT FROM OLD.win_rate OR
       NEW.current_streak IS DISTINCT FROM OLD.current_streak OR
       NEW.longest_streak IS DISTINCT FROM OLD.longest_streak OR
       NEW.global_rank IS DISTINCT FROM OLD.global_rank OR
       NEW.tournaments_won IS DISTINCT FROM OLD.tournaments_won OR
       NEW.tournaments_played IS DISTINCT FROM OLD.tournaments_played OR
       NEW.is_suspended IS DISTINCT FROM OLD.is_suspended OR
       NEW.banned_until IS DISTINCT FROM OLD.banned_until OR
       NEW.rating IS DISTINCT FROM OLD.rating
    THEN
      RAISE EXCEPTION 'Unauthorized attempt to modify sensitive account fields.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the redundant function I created earlier if it exists
DROP FUNCTION IF EXISTS public.tr_protect_profile_sensitive_columns();

-- ============================================================
-- Migration: 00100_remove_rate_limiting.sql
-- ============================================================

DROP FUNCTION IF EXISTS check_rate_limit(text, text, integer, integer);
DROP TABLE IF EXISTS rate_limits;
-- ============================================================
-- Migration: 00101_fix_challenge_policy_recursion.sql
-- ============================================================

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Participants can update live challenges" ON challenges;

-- Re-create it without the recursive subquery
CREATE POLICY "Participants can update live challenges" ON challenges
FOR UPDATE
TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id)
WITH CHECK (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Ensure "Opponents can update challenge status" also doesn't cause issues
-- (It didn't seem recursive, but let's make sure it's clean)
-- The existing one was: 
-- qual: ((auth.uid() = opponent_id) AND (status = 'pending'::text))
-- with_check: (status = ANY (ARRAY['accepted'::text, 'declined'::text]))
-- This is fine.

-- ============================================================
-- Migration: 00102_fix_profile_policy_recursion.sql
-- ============================================================

-- Create a helper function to get the current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Drop the recursive policies on profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile except role" ON profiles;

-- Re-create a clean policy that prevents role changes
CREATE POLICY "Users can update their own profile except role" ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = get_auth_user_role());

-- ============================================================
-- Migration: 00103_rebuild_bracket_system_from_scratch_v2.sql
-- ============================================================

-- ============================================================================
-- REBUILD TOURNAMENT BRACKET SYSTEM FROM SCRATCH
-- ============================================================================

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS advance_winner_trigger ON match_results;
DROP TRIGGER IF EXISTS check_tournament_completion_trigger ON match_results;
DROP FUNCTION IF EXISTS advance_winner() CASCADE;
DROP FUNCTION IF EXISTS check_tournament_completion() CASCADE;
DROP FUNCTION IF EXISTS generate_tournament_bracket(uuid) CASCADE;

-- ============================================================================
-- FUNCTION 1: GENERATE TOURNAMENT BRACKET
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_tournament_bracket(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_n integer;
  v_num_rounds integer;
  v_bracket_size integer;
  v_num_byes integer;
  v_match_index integer;
  v_seed1 integer;
  v_seed2 integer;
  v_player1_id uuid;
  v_player2_id uuid;
  v_team1_id uuid;
  v_team2_id uuid;
  v_match_id text;
  v_check_in_deadline timestamptz;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Count actual registered participants (not standby, limited by max_players)
  SELECT COUNT(*) INTO v_n
  FROM (
    SELECT user_id
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND is_standby = false
    ORDER BY created_at ASC
    LIMIT v_tournament.max_players
  ) subquery;

  IF v_n < 2 THEN
    RAISE EXCEPTION 'Need at least 2 participants to generate bracket';
  END IF;

  -- Calculate bracket structure
  v_num_rounds := CEIL(LOG(2, v_n));
  v_bracket_size := POWER(2, v_num_rounds)::integer;
  v_num_byes := v_bracket_size - v_n;

  -- Store num_rounds in tournaments table (CRITICAL)
  UPDATE tournaments
  SET num_rounds = v_num_rounds
  WHERE id = p_tournament_id;

  -- Assign bracket seeds to participants ordered by created_at
  v_match_index := 1;
  FOR v_participant IN
    SELECT user_id, team_id
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND is_standby = false
    ORDER BY created_at ASC
    LIMIT v_tournament.max_players
  LOOP
    UPDATE tournament_participants
    SET bracket_seed = v_match_index
    WHERE tournament_id = p_tournament_id
      AND user_id = v_participant.user_id;
    
    v_match_index := v_match_index + 1;
  END LOOP;

  -- Set bracket_seed to NULL for standby players
  UPDATE tournament_participants
  SET bracket_seed = NULL
  WHERE tournament_id = p_tournament_id
    AND is_standby = true;

  -- Generate bye matches (round 1, matches 0 to numByes-1)
  FOR v_match_index IN 0..(v_num_byes - 1) LOOP
    v_seed1 := v_match_index + 1;
    
    -- Find participant with this seed
    SELECT user_id, team_id INTO v_player1_id, v_team1_id
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND bracket_seed = v_seed1
    LIMIT 1;

    v_match_id := 'r1-m' || v_match_index;

    -- Insert bye match as pending first
    INSERT INTO match_results (
      tournament_id,
      match_id,
      round,
      player1_id,
      player2_id,
      winner_id,
      status,
      team1_id
    ) VALUES (
      p_tournament_id,
      v_match_id,
      1,
      v_player1_id,
      NULL,
      v_player1_id,
      'pending',
      CASE WHEN v_tournament.mode = 'team' THEN v_team1_id ELSE NULL END
    );

    -- Update to confirmed to fire the advance_winner trigger
    UPDATE match_results
    SET status = 'confirmed'
    WHERE tournament_id = p_tournament_id
      AND match_id = v_match_id;

    -- Send notification to bye player
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      tournament_id
    ) VALUES (
      v_player1_id,
      'tournament_update',
      'Bye - Auto Advance',
      'You received a bye and will automatically advance to round 2.',
      p_tournament_id
    );
  END LOOP;

  -- Generate real matches (round 1, matches numByes to bracketSize/2-1)
  FOR v_match_index IN v_num_byes..((v_bracket_size / 2) - 1) LOOP
    -- Pair lowest seed vs highest remaining seed
    v_seed1 := v_match_index + 1;
    v_seed2 := v_n - (v_match_index - v_num_byes);

    -- Find player 1
    SELECT user_id, team_id INTO v_player1_id, v_team1_id
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND bracket_seed = v_seed1
    LIMIT 1;

    -- Find player 2
    SELECT user_id, team_id INTO v_player2_id, v_team2_id
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND bracket_seed = v_seed2
    LIMIT 1;

    v_match_id := 'r1-m' || v_match_index;
    v_check_in_deadline := v_tournament.start_time + INTERVAL '5 minutes';

    -- Insert real match
    INSERT INTO match_results (
      tournament_id,
      match_id,
      round,
      player1_id,
      player2_id,
      status,
      check_in_deadline,
      team1_id,
      team2_id
    ) VALUES (
      p_tournament_id,
      v_match_id,
      1,
      v_player1_id,
      v_player2_id,
      'pending',
      v_check_in_deadline,
      CASE WHEN v_tournament.mode = 'team' THEN v_team1_id ELSE NULL END,
      CASE WHEN v_tournament.mode = 'team' THEN v_team2_id ELSE NULL END
    );

    -- Notify both players
    INSERT INTO notifications (user_id, type, title, message, tournament_id)
    VALUES (
      v_player1_id,
      'match_ready',
      'Match Pairing',
      'Your round 1 match is ready. Check in before the deadline.',
      p_tournament_id
    );

    INSERT INTO notifications (user_id, type, title, message, tournament_id)
    VALUES (
      v_player2_id,
      'match_ready',
      'Match Pairing',
      'Your round 1 match is ready. Check in before the deadline.',
      p_tournament_id
    );
  END LOOP;

  -- Mark bracket as generated
  UPDATE tournaments
  SET bracket_generated = true,
      bracket_generated_at = NOW()
  WHERE id = p_tournament_id;
END;
$$;

-- ============================================================================
-- FUNCTION 2: ADVANCE WINNER TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION advance_winner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_number integer;
  v_next_round integer;
  v_next_match_number integer;
  v_next_match_id text;
  v_num_rounds integer;
  v_next_match_exists boolean;
  v_player_slot text;
  v_tournament_mode text;
  v_winner_team_id uuid;
BEGIN
  -- Only process when status becomes confirmed and winner is set
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' AND NEW.winner_id IS NOT NULL THEN
    
    -- Extract match number from match_id (format: r1-m0, r2-m3, etc.)
    v_match_number := SUBSTRING(NEW.match_id FROM 'm(\d+)$')::integer;
    
    -- Calculate next round and match
    v_next_round := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id := 'r' || v_next_round || '-m' || v_next_match_number;

    -- Get num_rounds and mode from tournaments table (NEVER use MAX(round))
    SELECT num_rounds, mode INTO v_num_rounds, v_tournament_mode
    FROM tournaments
    WHERE id = NEW.tournament_id;

    -- Get winner's team_id if in team mode
    IF v_tournament_mode = 'team' THEN
      SELECT team_id INTO v_winner_team_id
      FROM tournament_participants
      WHERE tournament_id = NEW.tournament_id
        AND user_id = NEW.winner_id
      LIMIT 1;
    END IF;

    -- Determine which slot the winner fills (even = player1, odd = player2)
    IF v_match_number % 2 = 0 THEN
      v_player_slot := 'player1';
    ELSE
      v_player_slot := 'player2';
    END IF;

    -- Check if this is the final match
    IF v_next_round <= v_num_rounds THEN
      -- Check if next match exists
      SELECT EXISTS(
        SELECT 1
        FROM match_results
        WHERE tournament_id = NEW.tournament_id
          AND match_id = v_next_match_id
      ) INTO v_next_match_exists;

      IF v_next_match_exists THEN
        -- Update existing match with winner
        IF v_player_slot = 'player1' THEN
          UPDATE match_results
          SET player1_id = NEW.winner_id,
              team1_id = v_winner_team_id,
              check_in_deadline = CASE 
                WHEN player2_id IS NOT NULL THEN NOW() + INTERVAL '5 minutes'
                ELSE NULL
              END,
              both_players_ready = false,
              match_started_at = NULL
          WHERE tournament_id = NEW.tournament_id
            AND match_id = v_next_match_id;
        ELSE
          UPDATE match_results
          SET player2_id = NEW.winner_id,
              team2_id = v_winner_team_id,
              check_in_deadline = CASE 
                WHEN player1_id IS NOT NULL THEN NOW() + INTERVAL '5 minutes'
                ELSE NULL
              END,
              both_players_ready = false,
              match_started_at = NULL
          WHERE tournament_id = NEW.tournament_id
            AND match_id = v_next_match_id;
        END IF;
      ELSE
        -- Insert new match with one player
        IF v_player_slot = 'player1' THEN
          INSERT INTO match_results (
            tournament_id,
            match_id,
            round,
            player1_id,
            player2_id,
            status,
            check_in_deadline,
            team1_id
          ) VALUES (
            NEW.tournament_id,
            v_next_match_id,
            v_next_round,
            NEW.winner_id,
            NULL,
            'pending',
            NULL,
            v_winner_team_id
          );
        ELSE
          INSERT INTO match_results (
            tournament_id,
            match_id,
            round,
            player1_id,
            player2_id,
            status,
            check_in_deadline,
            team2_id
          ) VALUES (
            NEW.tournament_id,
            v_next_match_id,
            v_next_round,
            NULL,
            NEW.winner_id,
            'pending',
            NULL,
            v_winner_team_id
          );
        END IF;
      END IF;
    END IF;
    -- If v_next_round > v_num_rounds, this was the final match - do nothing
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for advance_winner
CREATE TRIGGER advance_winner_trigger
AFTER UPDATE ON match_results
FOR EACH ROW
EXECUTE FUNCTION advance_winner();

-- ============================================================================
-- FUNCTION 3: CHECK TOURNAMENT COMPLETION
-- ============================================================================
CREATE OR REPLACE FUNCTION check_tournament_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_num_rounds integer;
  v_final_match_id text;
  v_all_confirmed boolean;
BEGIN
  -- Only process when status becomes confirmed
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    
    -- Get num_rounds from tournaments table
    SELECT num_rounds INTO v_num_rounds
    FROM tournaments
    WHERE id = NEW.tournament_id;

    -- Build final match ID
    v_final_match_id := 'r' || v_num_rounds || '-m0';

    -- Check all three conditions:
    -- 1. This is the final match
    -- 2. Winner is set
    -- 3. All matches are confirmed
    IF NEW.match_id = v_final_match_id AND NEW.winner_id IS NOT NULL THEN
      
      -- Check if all matches are confirmed
      SELECT NOT EXISTS(
        SELECT 1
        FROM match_results
        WHERE tournament_id = NEW.tournament_id
          AND status != 'confirmed'
      ) INTO v_all_confirmed;

      IF v_all_confirmed THEN
        -- Tournament is complete
        UPDATE tournaments
        SET status = 'completed',
            winner_id = NEW.winner_id,
            ended_at = NOW()
        WHERE id = NEW.tournament_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for tournament completion
CREATE TRIGGER check_tournament_completion_trigger
AFTER UPDATE ON match_results
FOR EACH ROW
EXECUTE FUNCTION check_tournament_completion();
-- ============================================================
-- Migration: 00104_fix_check_in_logic_v1.sql
-- ============================================================

-- ============================================================================
-- UPDATE CHECK-IN TIMEOUT LOGIC
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_match_check_in_timeout(p_match_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_result record;
  v_tournament record;
  v_winner_id uuid;
  v_match_number integer;
  v_next_round integer;
  v_next_match_number integer;
  v_next_match_id text;
  v_player_slot text;
  v_num_rounds integer;
BEGIN
  -- Get match result details
  SELECT * INTO v_match_result FROM match_results WHERE id = p_match_result_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  -- If already confirmed or both ready, do nothing
  IF v_match_result.status = 'confirmed' OR (v_match_result.player1_checked_in AND v_match_result.player2_checked_in) THEN
    RETURN;
  END IF;

  -- Get tournament details
  SELECT num_rounds INTO v_num_rounds FROM tournaments WHERE id = v_match_result.tournament_id;

  -- Logic based on who checked in
  IF v_match_result.player1_checked_in AND NOT v_match_result.player2_checked_in THEN
    -- Player 1 wins by no-show
    v_winner_id := v_match_result.player1_id;
    
    UPDATE match_results 
    SET status = 'confirmed',
        winner_id = v_winner_id,
        updated_at = now()
    WHERE id = p_match_result_id;
    
    -- Eliminate player 2
    UPDATE tournament_participants 
    SET eliminated = true 
    WHERE tournament_id = v_match_result.tournament_id 
      AND user_id = v_match_result.player2_id;

  ELSIF NOT v_match_result.player1_checked_in AND v_match_result.player2_checked_in THEN
    -- Player 2 wins by no-show
    v_winner_id := v_match_result.player2_id;
    
    UPDATE match_results 
    SET status = 'confirmed',
        winner_id = v_winner_id,
        updated_at = now()
    WHERE id = p_match_result_id;
    
    -- Eliminate player 1
    UPDATE tournament_participants 
    SET eliminated = true 
    WHERE tournament_id = v_match_result.tournament_id 
      AND user_id = v_match_result.player1_id;

  ELSE
    -- Neither checked in: both eliminated
    UPDATE match_results 
    SET status = 'confirmed',
        winner_id = NULL,
        updated_at = now()
    WHERE id = p_match_result_id;
    
    UPDATE tournament_participants 
    SET eliminated = true 
    WHERE tournament_id = v_match_result.tournament_id 
      AND (user_id = v_match_result.player1_id OR user_id = v_match_result.player2_id);

    -- Parent match slot should receive a bye (NULL player)
    v_match_number := SUBSTRING(v_match_result.match_id FROM 'm(\d+)$')::integer;
    v_next_round := v_match_result.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id := 'r' || v_next_round || '-m' || v_next_match_number;

    IF v_next_round <= v_num_rounds THEN
      IF v_match_number % 2 = 0 THEN
        v_player_slot := 'player1';
      ELSE
        v_player_slot := 'player2';
      END IF;

      -- Update parent match row to set this slot as NULL
      -- This effectively gives the other player in the next match a bye if they exist,
      -- or keeps the slot empty if they don't yet.
      IF v_player_slot = 'player1' THEN
        UPDATE match_results
        SET player1_id = NULL,
            team1_id = NULL
        WHERE tournament_id = v_match_result.tournament_id
          AND match_id = v_next_match_id;
      ELSE
        UPDATE match_results
        SET player2_id = NULL,
            team2_id = NULL
        WHERE tournament_id = v_match_result.tournament_id
          AND match_id = v_next_match_id;
      END IF;
      
      -- If the parent match now has one NULL and one player, or two NULLs, handle accordingly
      -- Actually, the advance_winner trigger will fire when we set status = 'confirmed' above,
      -- but since winner_id is NULL, it won't do much.
      -- We explicitly handled the parent slot update here.
    END IF;
  END IF;
END;
$$;

-- ============================================================================
-- TRIGGER TO AUTOMATICALLY START MATCH WHEN BOTH READY
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_both_players_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.player1_checked_in AND NEW.player2_checked_in AND NOT OLD.both_players_ready THEN
    NEW.both_players_ready := true;
    NEW.match_started_at := now();
    NEW.match_deadline := now() + interval '30 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS both_players_ready_trigger ON match_results;
CREATE TRIGGER both_players_ready_trigger
BEFORE UPDATE ON match_results
FOR EACH ROW
WHEN (NEW.player1_checked_in AND NEW.player2_checked_in)
EXECUTE FUNCTION handle_both_players_ready();
-- ============================================================
-- Migration: 00105_fix_tournament_bracket_generation.sql
-- ============================================================

-- Drop existing functions to avoid confusion
DROP FUNCTION IF EXISTS generate_tournament_brackets();
DROP FUNCTION IF EXISTS generate_tournament_brackets(uuid);

-- Create a robust version of generate_tournament_brackets that takes an optional tournament_id
CREATE OR REPLACE FUNCTION generate_tournament_brackets(p_tournament_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_n integer;
  v_num_rounds integer;
  v_bracket_size integer;
  v_num_byes integer;
  v_match_index integer;
  v_match_id text;
  v_p1_id uuid;
  v_p2_id uuid;
  v_t1_id uuid;
  v_t2_id uuid;
  v_seed1 integer;
  v_seed2 integer;
  v_round integer;
  v_matches_in_round integer;
  v_check_in_deadline timestamptz;
BEGIN
  FOR v_tournament IN 
    SELECT * FROM tournaments
    WHERE (p_tournament_id IS NULL AND status = 'open' AND bracket_generated = false AND start_time <= now() + interval '15 minutes' AND current_players >= min_participants)
       OR (p_tournament_id IS NOT NULL AND id = p_tournament_id AND bracket_generated = false)
  LOOP
    -- Mark as generated and active
    UPDATE tournaments 
    SET bracket_generated = true, 
        bracket_generated_at = now(), 
        status = 'active'
    WHERE id = v_tournament.id;

    -- Calculate participants count
    IF v_tournament.mode = 'team' THEN
      SELECT count(*) INTO v_n FROM tournament_teams WHERE tournament_id = v_tournament.id;
    ELSE
      SELECT count(*) INTO v_n FROM tournament_participants WHERE tournament_id = v_tournament.id AND is_standby = false;
    END IF;

    -- If not enough participants, we can't generate a bracket
    IF v_n < 2 THEN 
      UPDATE tournaments SET bracket_generated = false, status = 'open' WHERE id = v_tournament.id;
      CONTINUE; 
    END IF;
    
    v_num_rounds := ceil(log(2, v_n))::integer;
    v_bracket_size := power(2, v_num_rounds)::integer;
    v_num_byes := v_bracket_size - v_n;

    -- Update tournament with num_rounds
    UPDATE tournaments SET num_rounds = v_num_rounds WHERE id = v_tournament.id;

    -- Assign seeds for individual tournaments
    IF v_tournament.mode != 'team' THEN
      WITH seeded_confirmed AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) as seed 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND is_standby = false
      )
      UPDATE tournament_participants tp 
      SET bracket_seed = sc.seed 
      FROM seeded_confirmed sc 
      WHERE tp.id = sc.id;
    END IF;

    -- Set check-in deadline (5 minutes from now)
    v_check_in_deadline := now() + interval '5 minutes';

    -- Create ALL matches for ALL rounds
    FOR v_round IN 1..v_num_rounds LOOP
      v_matches_in_round := power(2, v_num_rounds - v_round)::integer;
      
      FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
        v_match_id := 'r' || v_round || '-m' || v_match_index;
        v_p1_id := NULL;
        v_p2_id := NULL;
        v_t1_id := NULL;
        v_t2_id := NULL;

        -- For Round 1, populate players/teams
        IF v_round = 1 THEN
          IF v_match_index < v_num_byes THEN
            -- Bye match: player 1 vs nobody
            v_seed1 := v_match_index + 1;
            IF v_tournament.mode = 'team' THEN
               SELECT id, captain_id INTO v_t1_id, v_p1_id FROM (SELECT id, captain_id, row_number() OVER (ORDER BY created_at ASC) as seed FROM tournament_teams WHERE tournament_id = v_tournament.id) s WHERE seed = v_seed1;
            ELSE
               SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
            END IF;
            
            INSERT INTO match_results (
              tournament_id, match_id, round, player1_id, team1_id, winner_id, status, admin_override, match_duration_minutes
            ) VALUES (
              v_tournament.id, v_match_id, 1, v_p1_id, v_t1_id, v_p1_id, 'confirmed', true, COALESCE(v_tournament.match_time_limit, 30)
            ) ON CONFLICT (tournament_id, match_id) DO UPDATE 
            SET player1_id = EXCLUDED.player1_id, team1_id = EXCLUDED.team1_id, winner_id = EXCLUDED.winner_id, status = EXCLUDED.status;
          ELSE
            -- Real match
            v_seed1 := v_num_byes + (v_match_index - v_num_byes) * 2 + 1;
            v_seed2 := v_num_byes + (v_match_index - v_num_byes) * 2 + 2;
            
            IF v_tournament.mode = 'team' THEN
               SELECT id, captain_id INTO v_t1_id, v_p1_id FROM (SELECT id, captain_id, row_number() OVER (ORDER BY created_at ASC) as seed FROM tournament_teams WHERE tournament_id = v_tournament.id) s WHERE seed = v_seed1;
               SELECT id, captain_id INTO v_t2_id, v_p2_id FROM (SELECT id, captain_id, row_number() OVER (ORDER BY created_at ASC) as seed FROM tournament_teams WHERE tournament_id = v_tournament.id) s WHERE seed = v_seed2;
            ELSE
               SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
               SELECT user_id INTO v_p2_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
            END IF;
            
            INSERT INTO match_results (
              tournament_id, match_id, round, player1_id, player2_id, team1_id, team2_id, 
              status, match_duration_minutes, check_in_deadline
            ) VALUES (
              v_tournament.id, v_match_id, 1, v_p1_id, v_p2_id, v_t1_id, v_t2_id, 
              'pending', COALESCE(v_tournament.match_time_limit, 30), v_check_in_deadline
            ) ON CONFLICT (tournament_id, match_id) DO UPDATE 
            SET player1_id = EXCLUDED.player1_id, player2_id = EXCLUDED.player2_id, team1_id = EXCLUDED.team1_id, team2_id = EXCLUDED.team2_id, check_in_deadline = EXCLUDED.check_in_deadline;
          END IF;
        ELSE
          -- Round 2+, create empty match record
          INSERT INTO match_results (
            tournament_id, match_id, round, status, match_duration_minutes
          ) VALUES (
            v_tournament.id, v_match_id, v_round, 'pending', COALESCE(v_tournament.match_time_limit, 30)
          ) ON CONFLICT (tournament_id, match_id) DO NOTHING;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================
-- Migration: 00106_cleanup_and_fix_bracket_generation.sql
-- ============================================================

-- Delete the singular RPC
DROP FUNCTION IF EXISTS generate_tournament_bracket(uuid);

-- Update the plural RPC to be more robust
CREATE OR REPLACE FUNCTION generate_tournament_brackets(p_tournament_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_n integer;
  v_num_rounds integer;
  v_bracket_size integer;
  v_num_byes integer;
  v_match_index integer;
  v_match_id text;
  v_p1_id uuid;
  v_p2_id uuid;
  v_t1_id uuid;
  v_t2_id uuid;
  v_seed1 integer;
  v_seed2 integer;
  v_round integer;
  v_matches_in_round integer;
  v_check_in_deadline timestamptz;
BEGIN
  FOR v_tournament IN 
    SELECT * FROM tournaments
    WHERE (p_tournament_id IS NULL AND status = 'open' AND bracket_generated = false AND start_time <= now() + interval '15 minutes' AND current_players >= min_participants)
       OR (p_tournament_id IS NOT NULL AND id = p_tournament_id AND bracket_generated = false)
  LOOP
    -- Mark as generated and active IMMEDIATELY to prevent double execution
    UPDATE tournaments 
    SET bracket_generated = true, 
        bracket_generated_at = now(), 
        status = 'active'
    WHERE id = v_tournament.id;

    -- Calculate participants count
    IF v_tournament.mode = 'team' THEN
      SELECT count(*) INTO v_n FROM tournament_teams WHERE tournament_id = v_tournament.id;
    ELSE
      SELECT count(*) INTO v_n FROM tournament_participants WHERE tournament_id = v_tournament.id AND is_standby = false;
    END IF;

    -- If not enough participants, we can't generate a bracket
    IF v_n < 2 THEN 
      UPDATE tournaments SET bracket_generated = false, status = 'open' WHERE id = v_tournament.id;
      CONTINUE; 
    END IF;
    
    v_num_rounds := ceil(log(2, v_n))::integer;
    v_bracket_size := power(2, v_num_rounds)::integer;
    v_num_byes := v_bracket_size - v_n;

    -- Update tournament with num_rounds
    UPDATE tournaments SET num_rounds = v_num_rounds WHERE id = v_tournament.id;

    -- Assign seeds for individual tournaments (1-indexed)
    IF v_tournament.mode != 'team' THEN
      WITH seeded_confirmed AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) as seed 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND is_standby = false
      )
      UPDATE tournament_participants tp 
      SET bracket_seed = sc.seed 
      FROM seeded_confirmed sc 
      WHERE tp.id = sc.id;
    ELSE
      -- Assign seeds for teams if not already assigned
      WITH seeded_teams AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) as seed 
        FROM tournament_teams 
        WHERE tournament_id = v_tournament.id
      )
      UPDATE tournament_teams tt 
      SET bracket_seed = st.seed 
      FROM seeded_teams st 
      WHERE tt.id = st.id;
    END IF;

    -- Set check-in deadline (5 minutes from now)
    v_check_in_deadline := now() + interval '5 minutes';

    -- Delete any existing match results for this tournament to ensure a clean slate
    DELETE FROM match_results WHERE tournament_id = v_tournament.id;

    -- Create ALL matches for ALL rounds
    FOR v_round IN 1..v_num_rounds LOOP
      v_matches_in_round := power(2, v_num_rounds - v_round)::integer;
      
      FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
        v_match_id := 'r' || v_round || '-m' || v_match_index;
        v_p1_id := NULL;
        v_p2_id := NULL;
        v_t1_id := NULL;
        v_t2_id := NULL;

        -- For Round 1, populate players/teams
        IF v_round = 1 THEN
          IF v_match_index < v_num_byes THEN
            -- Bye match: player 1 vs nobody
            v_seed1 := v_match_index + 1;
            IF v_tournament.mode = 'team' THEN
               SELECT id, captain_id INTO v_t1_id, v_p1_id FROM tournament_teams WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
            ELSE
               SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
            END IF;
            
            INSERT INTO match_results (
              tournament_id, match_id, round, player1_id, team1_id, winner_id, status, admin_override, match_duration_minutes, both_players_ready
            ) VALUES (
              v_tournament.id, v_match_id, 1, v_p1_id, v_t1_id, v_p1_id, 'confirmed', true, COALESCE(v_tournament.match_time_limit, 30), false
            );
          ELSE
            -- Real match
            v_seed1 := v_num_byes + (v_match_index - v_num_byes) * 2 + 1;
            v_seed2 := v_num_byes + (v_match_index - v_num_byes) * 2 + 2;
            
            IF v_tournament.mode = 'team' THEN
               SELECT id, captain_id INTO v_t1_id, v_p1_id FROM tournament_teams WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
               SELECT id, captain_id INTO v_t2_id, v_p2_id FROM tournament_teams WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
            ELSE
               SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
               SELECT user_id INTO v_p2_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
            END IF;
            
            INSERT INTO match_results (
              tournament_id, match_id, round, player1_id, player2_id, team1_id, team2_id, 
              status, match_duration_minutes, check_in_deadline, both_players_ready
            ) VALUES (
              v_tournament.id, v_match_id, 1, v_p1_id, v_p2_id, v_t1_id, v_t2_id, 
              'pending', COALESCE(v_tournament.match_time_limit, 30), v_check_in_deadline, false
            );
          END IF;
        ELSE
          -- Round 2+, create empty match record
          INSERT INTO match_results (
            tournament_id, match_id, round, status, match_duration_minutes, both_players_ready
          ) VALUES (
            v_tournament.id, v_match_id, v_round, 'pending', COALESCE(v_tournament.match_time_limit, 30), false
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================
-- Migration: 00107_final_bracket_logic_fix.sql
-- ============================================================

-- Ensure only plural RPC exists
DROP FUNCTION IF EXISTS generate_tournament_bracket(uuid);

-- Simplified and robust bracket generation
CREATE OR REPLACE FUNCTION generate_tournament_brackets(p_tournament_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_n integer;
  v_num_rounds integer;
  v_bracket_size integer;
  v_num_byes integer;
  v_match_index integer;
  v_match_id text;
  v_p1_id uuid;
  v_p2_id uuid;
  v_t1_id uuid;
  v_t2_id uuid;
  v_seed1 integer;
  v_seed2 integer;
  v_round integer;
  v_matches_in_round integer;
  v_check_in_deadline timestamptz;
BEGIN
  FOR v_tournament IN 
    SELECT * FROM tournaments
    WHERE (p_tournament_id IS NULL AND status = 'open' AND bracket_generated = false AND start_time <= now() + interval '15 minutes' AND current_players >= min_participants)
       OR (p_tournament_id IS NOT NULL AND id = p_tournament_id AND bracket_generated = false)
  LOOP
    -- 1. Count entities
    IF v_tournament.mode = 'team' THEN
      SELECT count(*) INTO v_n FROM tournament_teams WHERE tournament_id = v_tournament.id;
    ELSE
      SELECT count(*) INTO v_n FROM tournament_participants WHERE tournament_id = v_tournament.id AND is_standby = false;
    END IF;

    IF v_n < 2 THEN CONTINUE; END IF;

    -- 2. Mark tournament
    UPDATE tournaments 
    SET bracket_generated = true, 
        bracket_generated_at = now(), 
        status = 'active'
    WHERE id = v_tournament.id;
    
    v_num_rounds := ceil(log(2, v_n))::integer;
    v_bracket_size := power(2, v_num_rounds)::integer;
    v_num_byes := v_bracket_size - v_n;

    UPDATE tournaments SET num_rounds = v_num_rounds WHERE id = v_tournament.id;

    -- 3. Clear and assign fresh seeds
    IF v_tournament.mode != 'team' THEN
      UPDATE tournament_participants SET bracket_seed = NULL WHERE tournament_id = v_tournament.id;
      WITH seeded AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) as new_seed 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND is_standby = false
      )
      UPDATE tournament_participants tp 
      SET bracket_seed = seeded.new_seed 
      FROM seeded 
      WHERE tp.id = seeded.id;
    ELSE
      UPDATE tournament_teams SET bracket_seed = NULL WHERE tournament_id = v_tournament.id;
      WITH seeded AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) as new_seed 
        FROM tournament_teams 
        WHERE tournament_id = v_tournament.id
      )
      UPDATE tournament_teams tt 
      SET bracket_seed = seeded.new_seed 
      FROM seeded 
      WHERE tt.id = seeded.id;
    END IF;

    -- 4. Set common deadline
    v_check_in_deadline := now() + interval '5 minutes';

    -- 5. Clean matches
    DELETE FROM match_results WHERE tournament_id = v_tournament.id;

    -- 6. Generate matches
    FOR v_round IN 1..v_num_rounds LOOP
      v_matches_in_round := power(2, v_num_rounds - v_round)::integer;
      FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
        v_match_id := 'r' || v_round || '-m' || v_match_index;
        v_p1_id := NULL; v_p2_id := NULL; v_t1_id := NULL; v_t2_id := NULL;

        IF v_round = 1 THEN
          IF v_match_index < v_num_byes THEN
            -- Bye
            v_seed1 := v_match_index + 1;
            IF v_tournament.mode = 'team' THEN
               SELECT id, captain_id INTO v_t1_id, v_p1_id FROM tournament_teams WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
            ELSE
               SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
            END IF;
            
            INSERT INTO match_results (
              tournament_id, match_id, round, player1_id, team1_id, winner_id, status, both_players_ready
            ) VALUES (
              v_tournament.id, v_match_id, 1, v_p1_id, v_t1_id, v_p1_id, 'confirmed', false
            );
          ELSE
            -- Real
            v_seed1 := v_num_byes + (v_match_index - v_num_byes) * 2 + 1;
            v_seed2 := v_num_byes + (v_match_index - v_num_byes) * 2 + 2;
            
            IF v_tournament.mode = 'team' THEN
               SELECT id, captain_id INTO v_t1_id, v_p1_id FROM tournament_teams WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
               SELECT id, captain_id INTO v_t2_id, v_p2_id FROM tournament_teams WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
            ELSE
               SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
               SELECT user_id INTO v_p2_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
            END IF;
            
            INSERT INTO match_results (
              tournament_id, match_id, round, player1_id, player2_id, team1_id, team2_id, 
              status, match_duration_minutes, check_in_deadline, both_players_ready
            ) VALUES (
              v_tournament.id, v_match_id, 1, v_p1_id, v_p2_id, v_t1_id, v_t2_id, 
              'pending', COALESCE(v_tournament.match_time_limit, 30), v_check_in_deadline, false
            );
          END IF;
        ELSE
          -- Placeholder for future rounds
          INSERT INTO match_results (
            tournament_id, match_id, round, status, match_duration_minutes, both_players_ready
          ) VALUES (
            v_tournament.id, v_match_id, v_round, 'pending', COALESCE(v_tournament.match_time_limit, 30), false
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- Ensure advance_winner always sets deadline when both players are ready
CREATE OR REPLACE FUNCTION advance_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_number integer;
  v_next_round integer;
  v_next_match_number integer;
  v_next_match_id text;
  v_num_rounds integer;
  v_tournament_mode text;
  v_winner_team_id uuid;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' AND NEW.winner_id IS NOT NULL THEN
    v_match_number := SUBSTRING(NEW.match_id FROM 'm(\\d+)$')::integer;
    v_next_round := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id := 'r' || v_next_round || '-m' || v_next_match_number;

    SELECT num_rounds, mode INTO v_num_rounds, v_tournament_mode
    FROM tournaments
    WHERE id = NEW.tournament_id;

    IF v_tournament_mode = 'team' THEN
      SELECT team_id INTO v_winner_team_id
      FROM tournament_participants
      WHERE tournament_id = NEW.tournament_id AND user_id = NEW.winner_id
      LIMIT 1;
    END IF;

    IF v_next_round <= v_num_rounds THEN
      IF v_match_number % 2 = 0 THEN
        UPDATE match_results
        SET player1_id = NEW.winner_id,
            team1_id = v_winner_team_id,
            check_in_deadline = CASE WHEN player2_id IS NOT NULL THEN NOW() + INTERVAL '5 minutes' ELSE check_in_deadline END,
            both_players_ready = false
        WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;
      ELSE
        UPDATE match_results
        SET player2_id = NEW.winner_id,
            team2_id = v_winner_team_id,
            check_in_deadline = CASE WHEN player1_id IS NOT NULL THEN NOW() + INTERVAL '5 minutes' ELSE check_in_deadline END,
            both_players_ready = false
        WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- Migration: 00108_add_exchange_rates_and_orders.sql
-- ============================================================

-- Order status enum (check if exists first)
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    items jsonb NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    currency text NOT NULL DEFAULT 'usd',
    status order_status NOT NULL DEFAULT 'pending'::order_status,
    stripe_session_id text UNIQUE,
    stripe_payment_intent_id text,
    customer_email text,
    customer_name text,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON public.orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
DO $$ BEGIN
    CREATE POLICY "Users can view own orders"
        ON public.orders FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Service role can manage orders
DO $$ BEGIN
    CREATE POLICY "Service role can manage orders"
        ON public.orders FOR ALL
        USING (true); -- We will rely on security definer functions or service role key
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Exchange Rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency text NOT NULL,
    target_currency text NOT NULL,
    rate numeric(20,8) NOT NULL,
    last_updated timestamptz DEFAULT now(),
    UNIQUE(base_currency, target_currency)
);

-- Users can view exchange rates
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Anyone can view exchange rates"
        ON public.exchange_rates FOR SELECT
        USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add demo data for exchange rates
INSERT INTO public.exchange_rates (base_currency, target_currency, rate)
VALUES 
('USD', 'KES', 129.5),
('USD', 'NGN', 1550),
('USD', 'GHS', 15.2),
('USD', 'UGX', 3680),
('USD', 'TZS', 2580)
ON CONFLICT (base_currency, target_currency) DO UPDATE SET rate = EXCLUDED.rate;

-- ============================================================
-- Migration: 00109_add_increment_arena_currency_rpc.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_arena_currency(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET arena_currency = COALESCE(arena_currency, 0) + p_amount
    WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- Migration: 00110_fix_match_results_structure.sql
-- ============================================================

-- migration: fix_match_results_structure
-- Fix nullability and defaults for core columns
UPDATE match_results SET player1_checked_in = COALESCE(player1_checked_in, false) WHERE player1_checked_in IS NULL;
UPDATE match_results SET player2_checked_in = COALESCE(player2_checked_in, false) WHERE player2_checked_in IS NULL;
UPDATE match_results SET both_players_ready = COALESCE(both_players_ready, false) WHERE both_players_ready IS NULL;
UPDATE match_results SET replacement_count = COALESCE(replacement_count, 0) WHERE replacement_count IS NULL;

ALTER TABLE match_results 
  ALTER COLUMN player1_checked_in SET NOT NULL,
  ALTER COLUMN player1_checked_in SET DEFAULT false,
  ALTER COLUMN player2_checked_in SET NOT NULL,
  ALTER COLUMN player2_checked_in SET DEFAULT false,
  ALTER COLUMN both_players_ready SET NOT NULL,
  ALTER COLUMN both_players_ready SET DEFAULT false,
  ALTER COLUMN replacement_count SET NOT NULL,
  ALTER COLUMN replacement_count SET DEFAULT 0,
  ALTER COLUMN match_duration_minutes SET DEFAULT 30;

-- Fix foreign keys to ON DELETE SET NULL
ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_player1_id_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_player1_id_fkey 
  FOREIGN KEY (player1_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_player2_id_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_player2_id_fkey 
  FOREIGN KEY (player2_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_player1_reported_winner_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_player1_reported_winner_fkey 
  FOREIGN KEY (player1_reported_winner) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_player2_reported_winner_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_player2_reported_winner_fkey 
  FOREIGN KEY (player2_reported_winner) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_winner_id_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_winner_id_fkey 
  FOREIGN KEY (winner_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Re-apply indexes
CREATE INDEX IF NOT EXISTS idx_match_results_tournament ON match_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_results_status ON match_results(status);
CREATE INDEX IF NOT EXISTS idx_match_results_players ON match_results(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_match_results_round ON match_results(tournament_id, round);
DROP INDEX IF EXISTS idx_match_results_pending_deadline;
CREATE INDEX idx_match_results_pending_deadline ON match_results(check_in_deadline) 
  WHERE status = 'pending' AND check_in_deadline IS NOT NULL;

-- Re-apply RLS policies
DROP POLICY IF EXISTS "Anyone can view match results" ON match_results;
CREATE POLICY "Anyone can view match results" ON match_results FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Players can insert their match results" ON match_results;
CREATE POLICY "Players can insert their match results" ON match_results FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Players can update their own reports" ON match_results;
CREATE POLICY "Players can update their own reports" ON match_results FOR UPDATE TO authenticated 
  USING (auth.uid() = player1_id OR auth.uid() = player2_id)
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Admins can update any match results" ON match_results;
CREATE POLICY "Admins can update any match results" ON match_results FOR UPDATE TO authenticated 
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Re-apply trigger
CREATE OR REPLACE FUNCTION _update_match_results_timestamp() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_results_updated_at ON match_results;
CREATE TRIGGER trg_match_results_updated_at
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION _update_match_results_timestamp();

-- ============================================================
-- Migration: 00111_create_checkin_enforcement_function_fix.sql
-- ============================================================

-- Remove old conflicting function
DROP FUNCTION IF EXISTS enforce_check_in_deadlines();

-- ── Cron-callable wrapper ─────────────────────────────────────────────────
-- Schedule this to run every 30–60 seconds via pg_cron or a Supabase
-- Edge Function on a schedule. It finds all pending matches whose
-- check-in window has expired and processes each one.
CREATE OR REPLACE FUNCTION process_expired_check_ins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match record;
BEGIN
  FOR v_match IN
    SELECT id
    FROM match_results
    WHERE status = 'pending'
      AND check_in_deadline IS NOT NULL
      AND check_in_deadline < now()
      -- Skip matches where both players already checked in
      -- (they should transition via the both_players_ready trigger instead)
      AND NOT (
        COALESCE(player1_checked_in, false)
        AND COALESCE(player2_checked_in, false)
      )
    ORDER BY check_in_deadline ASC  -- Process oldest expired matches first
  LOOP
    -- Delegate to the canonical per-match handler (defined in 00104)
    PERFORM handle_match_check_in_timeout(v_match.id);
  END LOOP;
END;
$$;

-- ============================================================
-- Migration: 00112_fix_check_in_logic_v1_corrected.sql
-- ============================================================

-- migration: fix_check_in_logic_v1_corrected

-- ── Per-match check-in timeout handler ───────────────────────────────────
CREATE OR REPLACE FUNCTION handle_match_check_in_timeout(p_match_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match  match_results%ROWTYPE;
  v_winner uuid;
  v_loser  uuid;
BEGIN
  -- Lock the row so concurrent cron calls don't double-process
  SELECT * INTO v_match
  FROM match_results
  WHERE id = p_match_result_id
  FOR UPDATE SKIP LOCKED;

  -- Row locked by another call or not found — skip
  IF NOT FOUND THEN RETURN; END IF;

  -- ── Guards ─────────────────────────────────────────────────────────────
  -- Already resolved
  IF v_match.status = 'confirmed' THEN RETURN; END IF;

  -- Both already checked in — the ready trigger should have handled this
  IF COALESCE(v_match.player1_checked_in, false)
     AND COALESCE(v_match.player2_checked_in, false) THEN
    RETURN;
  END IF;

  -- Deadline hasn't arrived yet (safe to call early)
  IF v_match.check_in_deadline IS NULL
     OR v_match.check_in_deadline > now() THEN
    RETURN;
  END IF;

  -- ── Determine winner by check-in state ────────────────────────────────
  IF COALESCE(v_match.player1_checked_in, false)
     AND NOT COALESCE(v_match.player2_checked_in, false) THEN
    -- Player 1 showed up; Player 2 no-showed
    v_winner := v_match.player1_id;
    v_loser  := v_match.player2_id;
  ELSIF NOT COALESCE(v_match.player1_checked_in, false)
        AND COALESCE(v_match.player2_checked_in, false) THEN
    -- Player 2 showed up; Player 1 no-showed
    v_winner := v_match.player2_id;
    v_loser  := v_match.player1_id;
  ELSE
    -- Neither showed up — both eliminated, no winner propagates
    v_winner := NULL;
    v_loser  := NULL;
  END IF;

  -- ── Confirm the match ─────────────────────────────────────────────────
  -- Setting status = 'confirmed' fires the advance_winner trigger (00107)
  -- which places the winner into the next round automatically.
  UPDATE match_results
  SET status        = 'confirmed',
      winner_id     = v_winner,
      admin_override = true,
      updated_at    = now()
  WHERE id = p_match_result_id;

  -- ── Eliminate losers from tournament_participants ─────────────────────
  IF v_winner IS NOT NULL THEN
    -- Single no-show: eliminate the loser
    UPDATE tournament_participants
    SET eliminated = true
    WHERE tournament_id = v_match.tournament_id
      AND user_id = v_loser;
  ELSE
    -- Double no-show: eliminate both
    UPDATE tournament_participants
    SET eliminated = true
    WHERE tournament_id = v_match.tournament_id
      AND user_id IN (v_match.player1_id, v_match.player2_id);
  END IF;
END;
$$;

-- ── Match-start trigger: fires when both players are ready ────────────────
CREATE OR REPLACE FUNCTION handle_both_players_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when transitioning from not-ready to both-ready
  IF COALESCE(NEW.player1_checked_in, false)
     AND COALESCE(NEW.player2_checked_in, false)
     AND NOT COALESCE(OLD.both_players_ready, false) THEN
    NEW.both_players_ready := true;
    NEW.match_started_at   := now();
    -- Grace period: match must be reported within match_duration_minutes
    NEW.match_deadline     := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
  END IF;
  RETURN NEW;
END;
$$;

-- Re-create trigger WITHOUT a WHEN clause
DROP TRIGGER IF EXISTS trg_both_players_ready ON match_results;
CREATE TRIGGER trg_both_players_ready
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION handle_both_players_ready();

-- ============================================================
-- Migration: 00113_final_bracket_logic_fix_v284.sql
-- ============================================================

-- Prepare tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES profiles(id);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Drop old function if it exists
DROP FUNCTION IF EXISTS generate_tournament_bracket(uuid);

-- ── Bracket generation ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_tournament_brackets(p_tournament_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament          record;
  v_n                   integer;
  v_num_rounds          integer;
  v_bracket_size        integer;
  v_num_byes            integer;
  v_matches_in_round    integer;
  v_match_index         integer;
  v_match_id            text;
  v_round               integer;
  v_seed1               integer;
  v_seed2               integer;
  v_p1_id               uuid;
  v_p2_id               uuid;
  v_t1_id               uuid;
  v_t2_id               uuid;
  v_check_in_deadline   timestamptz;
  v_next_match_number   integer;
  v_next_match_id       text;
BEGIN
  FOR v_tournament IN
    SELECT * FROM tournaments
    WHERE
      (
        p_tournament_id IS NULL
        AND status = 'open'
        AND bracket_generated = false
        AND start_time <= now() + interval '15 minutes'
        AND current_players >= min_participants
      )
      OR
      (
        p_tournament_id IS NOT NULL
        AND id = p_tournament_id
        AND bracket_generated = false
      )
  LOOP
    -- ── 1. Count eligible entities ───────────────────────────────────────
    IF v_tournament.mode = 'team' THEN
      SELECT count(*) INTO v_n
      FROM tournament_teams
      WHERE tournament_id = v_tournament.id;
    ELSE
      SELECT count(*) INTO v_n
      FROM tournament_participants
      WHERE tournament_id = v_tournament.id AND is_standby = false;
    END IF;

    IF v_n < 2 THEN CONTINUE; END IF;

    -- ── 2. Bracket math ──────────────────────────────────────────────────
    v_num_rounds   := ceil(log(2, v_n::numeric))::integer;
    v_bracket_size := power(2, v_num_rounds)::integer;
    v_num_byes     := v_bracket_size - v_n;

    -- All real round-1 matches share the same deadline (set at generation time)
    v_check_in_deadline := now() + interval '5 minutes';

    -- ── 3. Mark tournament active ────────────────────────────────────────
    UPDATE tournaments
    SET bracket_generated     = true,
        bracket_generated_at  = now(),
        status                = 'active',
        num_rounds            = v_num_rounds
    WHERE id = v_tournament.id;

    -- ── 4. Assign bracket seeds ──────────────────────────────────────────
    IF v_tournament.mode != 'team' THEN
      UPDATE tournament_participants SET bracket_seed = NULL
      WHERE tournament_id = v_tournament.id;

      WITH seeded AS (
        SELECT id,
               row_number() OVER (ORDER BY created_at ASC) AS new_seed
        FROM tournament_participants
        WHERE tournament_id = v_tournament.id AND is_standby = false
      )
      UPDATE tournament_participants tp
      SET bracket_seed = seeded.new_seed
      FROM seeded WHERE tp.id = seeded.id;
    ELSE
      UPDATE tournament_teams SET bracket_seed = NULL
      WHERE tournament_id = v_tournament.id;

      WITH seeded AS (
        SELECT id,
               row_number() OVER (ORDER BY created_at ASC) AS new_seed
        FROM tournament_teams
        WHERE tournament_id = v_tournament.id
      )
      UPDATE tournament_teams tt
      SET bracket_seed = seeded.new_seed
      FROM seeded WHERE tt.id = seeded.id;
    END IF;

    -- ── 5. Wipe any previous match data ──────────────────────────────────
    DELETE FROM match_results WHERE tournament_id = v_tournament.id;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 1: Insert ALL placeholder rows for every round upfront.
    -- ════════════════════════════════════════════════════════════════════
    FOR v_round IN 1..v_num_rounds LOOP
      v_matches_in_round := power(2, v_num_rounds - v_round)::integer;
      FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          status,
          match_duration_minutes,
          both_players_ready,
          player1_checked_in,
          player2_checked_in
        ) VALUES (
          v_tournament.id,
          'r' || v_round || '-m' || v_match_index,
          v_round,
          'pending',
          COALESCE(v_tournament.match_time_limit, 30),
          false,
          false,
          false
        );
      END LOOP;
    END LOOP;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 2: Populate round 1 matches with real player assignments.
    -- ════════════════════════════════════════════════════════════════════
    v_matches_in_round := power(2, v_num_rounds - 1)::integer;
    FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
      v_match_id := 'r1-m' || v_match_index;
      v_p1_id := NULL; v_p2_id := NULL;
      v_t1_id := NULL; v_t2_id := NULL;

      IF v_match_index < v_num_byes THEN
        -- ────────────────────────────────────────────────────────────────
        -- BYE MATCH
        -- ────────────────────────────────────────────────────────────────
        v_seed1 := v_match_index + 1;
        IF v_tournament.mode = 'team' THEN
          SELECT captain_id, id INTO v_p1_id, v_t1_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
        ELSE
          SELECT user_id INTO v_p1_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
        END IF;

        -- Mark the bye match as confirmed with the bye player as winner
        UPDATE match_results
        SET player1_id     = v_p1_id,
            team1_id       = v_t1_id,
            winner_id      = v_p1_id,
            status         = 'confirmed',
            admin_override = true
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;

        -- Advance bye winner directly into round 2 (bypass trigger)
        v_next_match_number := v_match_index / 2;
        v_next_match_id     := 'r2-m' || v_next_match_number;
        IF v_match_index % 2 = 0 THEN
          UPDATE match_results
          SET player1_id         = v_p1_id,
              team1_id           = v_t1_id,
              player1_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        ELSE
          UPDATE match_results
          SET player2_id         = v_p1_id,
              team2_id           = v_t1_id,
              player2_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        END IF;
      ELSE
        -- ────────────────────────────────────────────────────────────────
        -- REAL MATCH
        -- ────────────────────────────────────────────────────────────────
        v_seed1 := v_num_byes + (v_match_index - v_num_byes) * 2 + 1;
        v_seed2 := v_num_byes + (v_match_index - v_num_byes) * 2 + 2;

        IF v_tournament.mode = 'team' THEN
          SELECT captain_id, id INTO v_p1_id, v_t1_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
          SELECT captain_id, id INTO v_p2_id, v_t2_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
        ELSE
          SELECT user_id INTO v_p1_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
          SELECT user_id INTO v_p2_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
        END IF;

        UPDATE match_results
        SET player1_id         = v_p1_id,
            player2_id         = v_p2_id,
            team1_id           = v_t1_id,
            team2_id           = v_t2_id,
            check_in_deadline  = v_check_in_deadline,
            player1_checked_in = false,
            player2_checked_in = false
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;
      END IF;
    END LOOP;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 3: Set deadlines for round 2 matches fully populated by byes
    -- ════════════════════════════════════════════════════════════════════
    UPDATE match_results
    SET check_in_deadline  = v_check_in_deadline,
        player1_checked_in = COALESCE(player1_checked_in, false),
        player2_checked_in = COALESCE(player2_checked_in, false)
    WHERE tournament_id    = v_tournament.id
      AND round            = 2
      AND player1_id       IS NOT NULL
      AND player2_id       IS NOT NULL
      AND check_in_deadline IS NULL
      AND status           = 'pending';
  END LOOP;
END;
$$;

-- ── Advance winner trigger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION advance_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_number      integer;
  v_next_round        integer;
  v_next_match_number integer;
  v_next_match_id     text;
  v_num_rounds        integer;
  v_tournament_mode   text;
  v_winner_team_id    uuid;
  v_next_match        match_results%ROWTYPE;
  v_other_player_id   uuid;
BEGIN
  -- Only act when a match transitions to confirmed WITH a winner
  IF NEW.status != 'confirmed'
     OR OLD.status = 'confirmed'
     OR NEW.winner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Parse match number from 'r{round}-m{number}'
  v_match_number      := SUBSTRING(NEW.match_id FROM 'm(\d+)$')::integer;
  v_next_round        := NEW.round + 1;
  v_next_match_number := v_match_number / 2;
  v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;

  SELECT num_rounds, mode
  INTO v_num_rounds, v_tournament_mode
  FROM tournaments
  WHERE id = NEW.tournament_id;

  -- ── Tournament complete ──────────────────────────────────────────────────
  IF v_next_round > v_num_rounds THEN
    -- This was the grand final — crown the winner
    UPDATE tournaments
    SET status       = 'completed',
        winner_id    = NEW.winner_id,
        completed_at = now()
    WHERE id = NEW.tournament_id;
    RETURN NEW;
  END IF;

  -- ── Resolve winner's team (team mode only) ───────────────────────────────
  IF v_tournament_mode = 'team' THEN
    SELECT team_id INTO v_winner_team_id
    FROM tournament_participants
    WHERE tournament_id = NEW.tournament_id
      AND user_id = NEW.winner_id
    LIMIT 1;
  END IF;

  -- ── Read current state of the next match ────────────────────────────────
  SELECT * INTO v_next_match
  FROM match_results
  WHERE tournament_id = NEW.tournament_id
    AND match_id      = v_next_match_id;

  IF NOT FOUND THEN
    RAISE WARNING 'advance_winner: target match % not found for tournament %',
      v_next_match_id, NEW.tournament_id;
    RETURN NEW;
  END IF;

  -- ── Place winner and conditionally activate check-in ─────────────────────
  IF v_match_number % 2 = 0 THEN
    -- Even match → winner fills player1 slot
    v_other_player_id := v_next_match.player2_id;
    UPDATE match_results
    SET player1_id         = NEW.winner_id,
        team1_id           = v_winner_team_id,
        player1_checked_in = false,
        both_players_ready = false,
        check_in_deadline  = CASE
                               WHEN v_other_player_id IS NOT NULL
                               THEN now() + interval '5 minutes'
                               ELSE check_in_deadline
                             END
    WHERE tournament_id = NEW.tournament_id
      AND match_id      = v_next_match_id;
  ELSE
    -- Odd match → winner fills player2 slot
    v_other_player_id := v_next_match.player1_id;
    UPDATE match_results
    SET player2_id         = NEW.winner_id,
        team2_id           = v_winner_team_id,
        player2_checked_in = false,
        both_players_ready = false,
        check_in_deadline  = CASE
                               WHEN v_other_player_id IS NOT NULL
                               THEN now() + interval '5 minutes'
                               ELSE check_in_deadline
                             END
    WHERE tournament_id = NEW.tournament_id
      AND match_id      = v_next_match_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS trg_advance_winner ON match_results;
CREATE TRIGGER trg_advance_winner
  AFTER UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION advance_winner();

-- ============================================================
-- Migration: 00114_final_bracket_logic_fix_reapply.sql
-- ============================================================

-- ============================================================================
-- BRACKET GENERATION + ADVANCE WINNER (CORRECTED)
--
-- Root causes fixed here:
--
--   BUG A — Bye advancement before round 2 rows exist
--     The old code generated rounds sequentially: round 1 first, then
--     round 2, etc. Bye matches were inserted as status='confirmed'
--     immediately. If advance_winner fires on INSERT (or on the first
--     UPDATE), it tries to UPDATE a round 2 row that doesn't exist yet.
--     The UPDATE silently touches zero rows. The bye winner is NEVER
--     placed in round 2.
--     FIX: Two-pass generation. Pass 1 creates ALL placeholder rows
--     across ALL rounds. Pass 2 populates round 1 player slots and
--     manually advances bye winners — no trigger dependency needed
--     for the initial placement.
--
--   BUG B — check_in_deadline stays NULL for round 2+ matches
--     advance_winner used CASE WHEN player2_id IS NOT NULL inside the
--     same UPDATE that was SETTING player1_id. The CASE reads the OLD
--     value of player2_id before the SET takes effect, which is correct
--     — but the real issue is the first winner to arrive (e.g. bye winner
--     placed in Pass 2) leaves deadline=NULL because the other slot is
--     empty. When the second winner arrives, the CASE fires correctly IF
--     it can see player1_id — but this only works if the function reads
--     the current DB state before writing. FIX: SELECT the next match row
--     first, check the other slot, then UPDATE. This is unambiguous.
--
--   BUG C — advance_winner didn't fire for bye matches at all
--     Bye matches were INSERTed directly with status='confirmed'. The
--     advance_winner trigger is AFTER UPDATE, not AFTER INSERT, so it
--     never fired for byes. FIX: Pass 2 explicitly runs the advancement
--     logic inline for each bye — no trigger needed.
--
--   BUG D — Tournament completion was silently ignored
--     When the final match confirmed, advance_winner tried to go to
--     round num_rounds+1, found no rows, and did nothing. The tournament
--     stayed in status='active' forever.
--     FIX: advance_winner now detects the final round and updates the
--     tournaments row to status='completed' with winner_id.
--
-- NOTE: Your tournaments table must have these columns for completion:
--   winner_id   uuid  REFERENCES profiles(id)
--   completed_at timestamptz
-- Add them with:
--   ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES profiles(id);
--   ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS completed_at timestamptz;
-- ============================================================================

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES profiles(id);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS completed_at timestamptz;

DROP FUNCTION IF EXISTS generate_tournament_bracket(uuid);

-- ── Bracket generation ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_tournament_brackets(p_tournament_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament          record;
  v_n                   integer;
  v_num_rounds          integer;
  v_bracket_size        integer;
  v_num_byes            integer;
  v_matches_in_round    integer;
  v_match_index         integer;
  v_match_id            text;
  v_round               integer;
  v_seed1               integer;
  v_seed2               integer;
  v_p1_id               uuid;
  v_p2_id               uuid;
  v_t1_id               uuid;
  v_t2_id               uuid;
  v_check_in_deadline   timestamptz;
  v_next_match_number   integer;
  v_next_match_id       text;
BEGIN
  FOR v_tournament IN
    SELECT * FROM tournaments
    WHERE
      (
        p_tournament_id IS NULL
        AND status = 'open'
        AND bracket_generated = false
        AND start_time <= now() + interval '15 minutes'
        AND current_players >= min_participants
      )
      OR
      (
        p_tournament_id IS NOT NULL
        AND id = p_tournament_id
        AND bracket_generated = false
      )
  LOOP

    -- ── 1. Count eligible entities ───────────────────────────────────────
    IF v_tournament.mode = 'team' THEN
      SELECT count(*) INTO v_n
      FROM tournament_teams
      WHERE tournament_id = v_tournament.id;
    ELSE
      SELECT count(*) INTO v_n
      FROM tournament_participants
      WHERE tournament_id = v_tournament.id AND is_standby = false;
    END IF;

    IF v_n < 2 THEN CONTINUE; END IF;

    -- ── 2. Bracket math ──────────────────────────────────────────────────
    v_num_rounds   := ceil(log(2, v_n::numeric))::integer;
    v_bracket_size := power(2, v_num_rounds)::integer;
    v_num_byes     := v_bracket_size - v_n;
    -- All real round-1 matches share the same deadline (set at generation time)
    v_check_in_deadline := now() + interval '5 minutes';

    -- ── 3. Mark tournament active ────────────────────────────────────────
    UPDATE tournaments
    SET bracket_generated     = true,
        bracket_generated_at  = now(),
        status                = 'active',
        num_rounds            = v_num_rounds
    WHERE id = v_tournament.id;

    -- ── 4. Assign bracket seeds ──────────────────────────────────────────
    IF v_tournament.mode != 'team' THEN
      UPDATE tournament_participants SET bracket_seed = NULL
      WHERE tournament_id = v_tournament.id;

      WITH seeded AS (
        SELECT id,
               row_number() OVER (ORDER BY created_at ASC) AS new_seed
        FROM tournament_participants
        WHERE tournament_id = v_tournament.id AND is_standby = false
      )
      UPDATE tournament_participants tp
      SET bracket_seed = seeded.new_seed
      FROM seeded WHERE tp.id = seeded.id;

    ELSE
      UPDATE tournament_teams SET bracket_seed = NULL
      WHERE tournament_id = v_tournament.id;

      WITH seeded AS (
        SELECT id,
               row_number() OVER (ORDER BY created_at ASC) AS new_seed
        FROM tournament_teams
        WHERE tournament_id = v_tournament.id
      )
      UPDATE tournament_teams tt
      SET bracket_seed = seeded.new_seed
      FROM seeded WHERE tt.id = seeded.id;
    END IF;

    -- ── 5. Wipe any previous match data ──────────────────────────────────
    DELETE FROM match_results WHERE tournament_id = v_tournament.id;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 1: Insert ALL placeholder rows for every round upfront.
    --
    -- Why: advance_winner is AFTER UPDATE — it never fires on INSERT.
    -- If round 2 rows don't exist when round 1 completes, the UPDATE
    -- inside advance_winner silently touches zero rows and the winner
    -- is lost. Creating all rows first guarantees the target always exists.
    -- ════════════════════════════════════════════════════════════════════
    FOR v_round IN 1..v_num_rounds LOOP
      v_matches_in_round := power(2, v_num_rounds - v_round)::integer;

      FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          status,
          match_duration_minutes,
          both_players_ready,
          player1_checked_in,
          player2_checked_in
        ) VALUES (
          v_tournament.id,
          'r' || v_round || '-m' || v_match_index,
          v_round,
          'pending',
          COALESCE(v_tournament.match_time_limit, 30),
          false,
          false,
          false
        );
      END LOOP;
    END LOOP;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 2: Populate round 1 matches with real player assignments.
    --
    -- Bye matches (match_index < v_num_byes):
    --   - Immediately confirmed with the bye player as winner
    --   - Winner is placed directly into the round 2 slot (no trigger)
    --
    -- Real matches (match_index >= v_num_byes):
    --   - Both player IDs assigned
    --   - check_in_deadline set so the frontend shows the check-in UI
    -- ════════════════════════════════════════════════════════════════════
    v_matches_in_round := power(2, v_num_rounds - 1)::integer;

    FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
      v_match_id := 'r1-m' || v_match_index;
      v_p1_id := NULL; v_p2_id := NULL;
      v_t1_id := NULL; v_t2_id := NULL;

      IF v_match_index < v_num_byes THEN
        -- ────────────────────────────────────────────────────────────────
        -- BYE MATCH
        -- ────────────────────────────────────────────────────────────────
        v_seed1 := v_match_index + 1;

        IF v_tournament.mode = 'team' THEN
          SELECT captain_id, id INTO v_p1_id, v_t1_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
        ELSE
          SELECT user_id INTO v_p1_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
        END IF;

        -- Mark the bye match as confirmed with the bye player as winner
        UPDATE match_results
        SET player1_id     = v_p1_id,
            team1_id       = v_t1_id,
            winner_id      = v_p1_id,
            status         = 'confirmed',
            admin_override = true
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;

        -- Advance bye winner directly into round 2 (bypass trigger)
        v_next_match_number := v_match_index / 2;
        v_next_match_id     := 'r2-m' || v_next_match_number;

        IF v_match_index % 2 = 0 THEN
          -- Even index → player1 slot in next match
          UPDATE match_results
          SET player1_id         = v_p1_id,
              team1_id           = v_t1_id,
              player1_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        ELSE
          -- Odd index → player2 slot in next match
          UPDATE match_results
          SET player2_id         = v_p1_id,
              team2_id           = v_t1_id,
              player2_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        END IF;

      ELSE
        -- ────────────────────────────────────────────────────────────────
        -- REAL MATCH
        -- Seeding: after all bye slots, pair remaining players sequentially.
        -- match_index=num_byes   → seeds (num_byes+1) vs (num_byes+2)
        -- match_index=num_byes+1 → seeds (num_byes+3) vs (num_byes+4)
        -- etc.
        -- ────────────────────────────────────────────────────────────────
        v_seed1 := v_num_byes + (v_match_index - v_num_byes) * 2 + 1;
        v_seed2 := v_num_byes + (v_match_index - v_num_byes) * 2 + 2;

        IF v_tournament.mode = 'team' THEN
          SELECT captain_id, id INTO v_p1_id, v_t1_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;

          SELECT captain_id, id INTO v_p2_id, v_t2_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
        ELSE
          SELECT user_id INTO v_p1_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;

          SELECT user_id INTO v_p2_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
        END IF;

        UPDATE match_results
        SET player1_id         = v_p1_id,
            player2_id         = v_p2_id,
            team1_id           = v_t1_id,
            team2_id           = v_t2_id,
            check_in_deadline  = v_check_in_deadline,
            player1_checked_in = false,
            player2_checked_in = false
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;
      END IF;
    END LOOP;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 3: Set deadlines for round 2 matches that are fully populated
    --         by byes (e.g. 5 players → seeds 1 & 2 both get byes and
    --         both land in r2-m0 — that match can start immediately).
    -- ════════════════════════════════════════════════════════════════════
    UPDATE match_results
    SET check_in_deadline  = v_check_in_deadline,
        player1_checked_in = COALESCE(player1_checked_in, false),
        player2_checked_in = COALESCE(player2_checked_in, false)
    WHERE tournament_id    = v_tournament.id
      AND round            = 2
      AND player1_id       IS NOT NULL
      AND player2_id       IS NOT NULL
      AND check_in_deadline IS NULL
      AND status           = 'pending';

  END LOOP;
END;
$$;


-- ── Advance winner trigger ────────────────────────────────────────────────
--
-- Fires AFTER a match transitions to status='confirmed' with a winner.
-- Places the winner into the correct slot of the next round match and,
-- if the other slot is already filled, sets the check-in deadline so
-- the frontend immediately shows the check-in UI to both players.
--
-- FIX: We SELECT the next match row BEFORE updating it. This lets us
-- read the current value of the other player's slot without any
-- ambiguity from the CASE expression reading stale data.
--
CREATE OR REPLACE FUNCTION advance_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_number      integer;
  v_next_round        integer;
  v_next_match_number integer;
  v_next_match_id     text;
  v_num_rounds        integer;
  v_tournament_mode   text;
  v_winner_team_id    uuid;
  v_next_match        match_results%ROWTYPE;
  v_other_player_id   uuid;
BEGIN
  -- Only act when a match transitions to confirmed WITH a winner
  -- (double no-show produces winner_id=NULL — handled separately)
  IF NEW.status != 'confirmed'
     OR OLD.status = 'confirmed'
     OR NEW.winner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Parse match number from 'r{round}-m{number}'
  v_match_number      := SUBSTRING(NEW.match_id FROM 'm(\d+)$')::integer;
  v_next_round        := NEW.round + 1;
  v_next_match_number := v_match_number / 2;
  v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;

  SELECT num_rounds, mode
  INTO v_num_rounds, v_tournament_mode
  FROM tournaments
  WHERE id = NEW.tournament_id;

  -- ── Tournament complete ──────────────────────────────────────────────────
  IF v_next_round > v_num_rounds THEN
    -- This was the grand final — crown the winner
    UPDATE tournaments
    SET status       = 'completed',
        winner_id    = NEW.winner_id,
        completed_at = now()
    WHERE id = NEW.tournament_id;
    RETURN NEW;
  END IF;

  -- ── Resolve winner's team (team mode only) ───────────────────────────────
  IF v_tournament_mode = 'team' THEN
    SELECT team_id INTO v_winner_team_id
    FROM tournament_participants
    WHERE tournament_id = NEW.tournament_id
      AND user_id = NEW.winner_id
    LIMIT 1;
  END IF;

  -- ── Read current state of the next match ────────────────────────────────
  -- We do this BEFORE the UPDATE so we can see whether the other slot
  -- already has a player. This is the fix for the deadline-stays-NULL bug.
  SELECT * INTO v_next_match
  FROM match_results
  WHERE tournament_id = NEW.tournament_id
    AND match_id      = v_next_match_id;

  IF NOT FOUND THEN
    -- Should never happen after the two-pass generation, but guard anyway
    RAISE WARNING 'advance_winner: target match % not found for tournament %',
      v_next_match_id, NEW.tournament_id;
    RETURN NEW;
  END IF;

  -- ── Place winner and conditionally activate check-in ─────────────────────
  IF v_match_number % 2 = 0 THEN
    -- Even match → winner fills player1 slot
    -- Deadline activates if player2 is already waiting
    v_other_player_id := v_next_match.player2_id;

    UPDATE match_results
    SET player1_id         = NEW.winner_id,
        team1_id           = v_winner_team_id,
        player1_checked_in = false,
        both_players_ready = false,
        check_in_deadline  = CASE
                               WHEN v_other_player_id IS NOT NULL
                               THEN now() + interval '5 minutes'
                               ELSE check_in_deadline   -- keep NULL until both slots filled
                             END
    WHERE tournament_id = NEW.tournament_id
      AND match_id      = v_next_match_id;

  ELSE
    -- Odd match → winner fills player2 slot
    -- Deadline activates if player1 is already waiting
    v_other_player_id := v_next_match.player1_id;

    UPDATE match_results
    SET player2_id         = NEW.winner_id,
        team2_id           = v_winner_team_id,
        player2_checked_in = false,
        both_players_ready = false,
        check_in_deadline  = CASE
                               WHEN v_other_player_id IS NOT NULL
                               THEN now() + interval '5 minutes'
                               ELSE check_in_deadline
                             END
    WHERE tournament_id = NEW.tournament_id
      AND match_id      = v_next_match_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached (AFTER UPDATE only — byes are handled
-- inline in generate_tournament_brackets, not via this trigger)
DROP TRIGGER IF EXISTS trg_advance_winner ON match_results;
CREATE TRIGGER trg_advance_winner
  AFTER UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION advance_winner();

-- ============================================================
-- Migration: 00115_fix_tournament_status_update_rpc.sql
-- ============================================================

CREATE OR REPLACE FUNCTION check_and_update_tournament_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Generate brackets for tournaments starting soon
  PERFORM generate_tournament_brackets();

  -- 2. Start tournaments that have reached start time
  -- Note: generate_tournament_brackets already sets status to 'active' for tournaments it processes,
  -- but this handles cases where bracket was generated but status was still 'open' (if any).
  UPDATE tournaments
  SET status = 'active'
  WHERE status = 'open'
    AND bracket_generated = true
    AND start_time <= now()
    AND current_players >= min_participants;

  -- 3. Enforce check-in deadlines
  -- Changed from enforce_check_in_deadlines() to process_expired_check_ins()
  PERFORM process_expired_check_ins();

  -- 4. Cancel tournaments that didn't meet minimum participants
  UPDATE tournaments
  SET status = 'cancelled'
  WHERE status = 'open'
    AND start_time <= now()
    AND current_players < min_participants;

  -- 5. Complete tournaments where all matches are confirmed
  UPDATE tournaments t
  SET status = 'completed',
      updated_at = now()
  WHERE t.status = 'active'
    AND EXISTS (SELECT 1 FROM match_results mr WHERE mr.tournament_id = t.id)
    AND NOT EXISTS (
      SELECT 1 FROM match_results mr 
      WHERE mr.tournament_id = t.id 
        AND mr.status != 'confirmed'
    );

  -- 6. Refund cancelled tournaments (if not already refunded)
  PERFORM refund_tournament_entry_fees(id)
  FROM tournaments
  WHERE status = 'cancelled'
    AND NOT EXISTS (
      SELECT 1 FROM transactions 
      WHERE tournament_id = tournaments.id 
        AND type = 'refund'
    );
END;
$$;

-- ============================================================
-- Migration: 00116_fix_bracket_generation_timing.sql
-- ============================================================

-- Update generate_tournament_brackets to only generate at or after start_time
CREATE OR REPLACE FUNCTION generate_tournament_brackets(p_tournament_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament          record;
  v_n                   integer;
  v_num_rounds          integer;
  v_bracket_size        integer;
  v_num_byes            integer;
  v_matches_in_round    integer;
  v_match_index         integer;
  v_match_id            text;
  v_round               integer;
  v_seed1               integer;
  v_seed2               integer;
  v_p1_id               uuid;
  v_p2_id               uuid;
  v_t1_id               uuid;
  v_t2_id               uuid;
  v_check_in_deadline   timestamptz;
  v_next_match_number   integer;
  v_next_match_id       text;
BEGIN
  FOR v_tournament IN
    SELECT * FROM tournaments
    WHERE
      (
        p_tournament_id IS NULL
        AND status = 'open'
        AND bracket_generated = false
        AND start_time <= now() -- Changed from now() + interval '15 minutes'
        AND current_players >= min_participants
      )
      OR
      (
        p_tournament_id IS NOT NULL
        AND id = p_tournament_id
        AND bracket_generated = false
      )
  LOOP

    -- ── 1. Count eligible entities ───────────────────────────────────────
    IF v_tournament.mode = 'team' THEN
      SELECT count(*) INTO v_n
      FROM tournament_teams
      WHERE tournament_id = v_tournament.id;
    ELSE
      SELECT count(*) INTO v_n
      FROM tournament_participants
      WHERE tournament_id = v_tournament.id AND is_standby = false;
    END IF;

    IF v_n < 2 THEN CONTINUE; END IF;

    -- ── 2. Bracket math ──────────────────────────────────────────────────
    v_num_rounds   := ceil(log(2, v_n::numeric))::integer;
    v_bracket_size := power(2, v_num_rounds)::integer;
    v_num_byes     := v_bracket_size - v_n;
    
    -- The ready check deadline is now() + 5 minutes. 
    -- Since we only generate the bracket at start_time, this will be start_time + 5 mins.
    v_check_in_deadline := now() + interval '5 minutes';

    -- ── 3. Mark tournament active ────────────────────────────────────────
    UPDATE tournaments
    SET bracket_generated     = true,
        bracket_generated_at  = now(),
        status                = 'active',
        num_rounds            = v_num_rounds
    WHERE id = v_tournament.id;

    -- ── 4. Assign bracket seeds ──────────────────────────────────────────
    IF v_tournament.mode != 'team' THEN
      UPDATE tournament_participants SET bracket_seed = NULL
      WHERE tournament_id = v_tournament.id;

      WITH seeded AS (
        SELECT id,
               row_number() OVER (ORDER BY created_at ASC) AS new_seed
        FROM tournament_participants
        WHERE tournament_id = v_tournament.id AND is_standby = false
      )
      UPDATE tournament_participants tp
      SET bracket_seed = seeded.new_seed
      FROM seeded WHERE tp.id = seeded.id;

    ELSE
      UPDATE tournament_teams SET bracket_seed = NULL
      WHERE tournament_id = v_tournament.id;

      WITH seeded AS (
        SELECT id,
               row_number() OVER (ORDER BY created_at ASC) AS new_seed
        FROM tournament_teams
        WHERE tournament_id = v_tournament.id
      )
      UPDATE tournament_teams tt
      SET bracket_seed = seeded.new_seed
      FROM seeded WHERE tt.id = seeded.id;
    END IF;

    -- ── 5. Wipe any previous match data ──────────────────────────────────
    DELETE FROM match_results WHERE tournament_id = v_tournament.id;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 1: Insert ALL placeholder rows for every round upfront.
    -- ════════════════════════════════════════════════════════════════════
    FOR v_round IN 1..v_num_rounds LOOP
      v_matches_in_round := power(2, v_num_rounds - v_round)::integer;

      FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          status,
          match_duration_minutes,
          both_players_ready,
          player1_checked_in,
          player2_checked_in
        ) VALUES (
          v_tournament.id,
          'r' || v_round || '-m' || v_match_index,
          v_round,
          'pending',
          COALESCE(v_tournament.match_time_limit, 30),
          false,
          false,
          false
        );
      END LOOP;
    END LOOP;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 2: Populate round 1 matches with real player assignments.
    -- ════════════════════════════════════════════════════════════════════
    v_matches_in_round := power(2, v_num_rounds - 1)::integer;

    FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
      v_match_id := 'r1-m' || v_match_index;
      v_p1_id := NULL; v_p2_id := NULL;
      v_t1_id := NULL; v_t2_id := NULL;

      IF v_match_index < v_num_byes THEN
        -- BYE MATCH
        v_seed1 := v_match_index + 1;

        IF v_tournament.mode = 'team' THEN
          SELECT captain_id, id INTO v_p1_id, v_t1_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
        ELSE
          SELECT user_id INTO v_p1_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
        END IF;

        UPDATE match_results
        SET player1_id     = v_p1_id,
            team1_id       = v_t1_id,
            winner_id      = v_p1_id,
            status         = 'confirmed',
            admin_override = true
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;

        v_next_match_number := v_match_index / 2;
        v_next_match_id     := 'r2-m' || v_next_match_number;

        IF v_match_index % 2 = 0 THEN
          UPDATE match_results
          SET player1_id         = v_p1_id,
              team1_id           = v_t1_id,
              player1_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        ELSE
          UPDATE match_results
          SET player2_id         = v_p1_id,
              team2_id           = v_t1_id,
              player2_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        END IF;

      ELSE
        -- REAL MATCH
        v_seed1 := v_num_byes + (v_match_index - v_num_byes) * 2 + 1;
        v_seed2 := v_num_byes + (v_match_index - v_num_byes) * 2 + 2;

        IF v_tournament.mode = 'team' THEN
          SELECT captain_id, id INTO v_p1_id, v_t1_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;

          SELECT captain_id, id INTO v_p2_id, v_t2_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
        ELSE
          SELECT user_id INTO v_p1_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;

          SELECT user_id INTO v_p2_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
        END IF;

        UPDATE match_results
        SET player1_id         = v_p1_id,
            player2_id         = v_p2_id,
            team1_id           = v_t1_id,
            team2_id           = v_t2_id,
            check_in_deadline  = v_check_in_deadline,
            player1_checked_in = false,
            player2_checked_in = false
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;
      END IF;
    END LOOP;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 3: Set deadlines for round 2 matches fully populated by byes
    -- ════════════════════════════════════════════════════════════════════
    UPDATE match_results
    SET check_in_deadline  = v_check_in_deadline,
        player1_checked_in = COALESCE(player1_checked_in, false),
        player2_checked_in = COALESCE(player2_checked_in, false)
    WHERE tournament_id    = v_tournament.id
      AND round            = 2
      AND player1_id       IS NOT NULL
      AND player2_id       IS NOT NULL
      AND check_in_deadline IS NULL
      AND status           = 'pending';

  END LOOP;
END;
$$;

-- ============================================================
-- Migration: 00117_login_skill_migration.sql
-- ============================================================

-- Helper function for RLS
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile except role" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- New policies based on skill requirements
CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM public.get_user_role(auth.uid()));

CREATE POLICY "Anyone can view public profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Public profiles view
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
  SELECT id, role, username, gamertag, avatar_url, bio, win_rate, global_rank, tier FROM public.profiles;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_gamertag text;
  v_username text;
  v_base_gamertag text;
  v_counter int := 1;
BEGIN
  -- Determine gamertag, fallback to email prefix if not provided
  v_base_gamertag := COALESCE(
    NEW.raw_user_meta_data->>'gamertag', 
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Ensure gamertag is not empty
  IF v_base_gamertag IS NULL OR v_base_gamertag = '' THEN
    v_base_gamertag := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;

  v_gamertag := v_base_gamertag;

  -- Handle gamertag uniqueness
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE gamertag = v_gamertag) LOOP
    v_gamertag := v_base_gamertag || v_counter::text;
    v_counter := v_counter + 1;
    IF v_counter > 100 THEN
      v_gamertag := v_base_gamertag || substr(NEW.id::text, 1, 8);
      EXIT;
    END IF;
  END LOOP;

  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  IF v_username IS NULL OR v_username = '' THEN
    v_username := v_gamertag;
  END IF;

  INSERT INTO public.profiles (
    id, 
    email, 
    phone, 
    role, 
    username, 
    full_name, 
    gamertag, 
    favorite_games, 
    location, 
    timezone
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    'user'::public.user_role,
    v_username,
    NEW.raw_user_meta_data->>'full_name',
    v_gamertag,
    CASE 
      WHEN NEW.raw_user_meta_data->'favorite_games' IS NOT NULL AND jsonb_typeof(NEW.raw_user_meta_data->'favorite_games') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'favorite_games'))::public.game_type[]
      ELSE '{}'::public.game_type[]
    END,
    NEW.raw_user_meta_data->>'location',
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- Migration: 00118_add_new_games_to_enum.sql
-- ============================================================

ALTER TYPE game_type ADD VALUE 'efootball';
ALTER TYPE game_type ADD VALUE 'pubg_mobile';
-- ============================================================
-- Migration: 00119_add_twitch_handle_to_profiles.sql
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitch_handle text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS efootball_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pubg_id text;
-- ============================================================
-- Migration: 00120_fix_chat_foreign_keys_to_profiles.sql
-- ============================================================

-- Drop old foreign keys pointing to auth.users
ALTER TABLE public.world_chat_messages DROP CONSTRAINT IF EXISTS world_chat_messages_user_id_fkey;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_sender_id_fkey;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_receiver_id_fkey;

-- Add new foreign keys pointing to public.profiles
ALTER TABLE public.world_chat_messages
ADD CONSTRAINT world_chat_messages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.direct_messages
ADD CONSTRAINT direct_messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.direct_messages
ADD CONSTRAINT direct_messages_receiver_id_fkey
FOREIGN KEY (receiver_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Migration: 00121_update_user_balance_function_for_ac.sql
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id uuid,
  p_amount numeric,
  p_balance_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_balance_type = 'available' THEN
    UPDATE profiles
    SET available_balance = COALESCE(available_balance, 0) + p_amount
    WHERE id = p_user_id;
  ELSIF p_balance_type = 'pending' THEN
    UPDATE profiles
    SET pending_balance = COALESCE(pending_balance, 0) + p_amount
    WHERE id = p_user_id;
  ELSIF p_balance_type = 'arena_currency' THEN
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + p_amount
    WHERE id = p_user_id;
  END IF;
END;
$$;
-- ============================================================
-- Migration: 00122_add_kyc_status_to_profiles.sql
-- ============================================================

-- Add kyc_status to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'not_verified';

-- Add check constraint for kyc_status
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS kyc_status_check;
ALTER TABLE profiles ADD CONSTRAINT kyc_status_check CHECK (kyc_status IN ('not_verified', 'pending', 'verified', 'rejected'));

-- Update existing profiles to 'not_verified' if they are null
UPDATE profiles SET kyc_status = 'not_verified' WHERE kyc_status IS NULL;
-- ============================================================
-- Migration: 00123_add_parent_message_id_to_chat.sql
-- ============================================================


ALTER TABLE world_chat_messages ADD COLUMN parent_message_id UUID REFERENCES world_chat_messages(id);
ALTER TABLE direct_messages ADD COLUMN parent_message_id UUID REFERENCES direct_messages(id);

-- ============================================================
-- Migration: 00124_secure_wallet_payout_and_webhook_v4.sql
-- ============================================================

-- Harden wallet operations against race conditions and negative balances

-- 1. Enforce non-negative arena_currency
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_arena_currency_non_negative;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_arena_currency_non_negative CHECK (arena_currency >= 0);

-- 2. Drop old function and create a floor-guarded version that returns success/failure
DROP FUNCTION IF EXISTS public.update_user_balance(uuid, numeric, text);

CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id uuid,
  p_amount numeric,
  p_balance_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated int;
BEGIN
  IF p_balance_type = 'available' THEN
    UPDATE profiles
    SET available_balance = COALESCE(available_balance, 0) + p_amount
    WHERE id = p_user_id
      AND COALESCE(available_balance, 0) + p_amount >= 0;
  ELSIF p_balance_type = 'pending' THEN
    UPDATE profiles
    SET pending_balance = COALESCE(pending_balance, 0) + p_amount
    WHERE id = p_user_id
      AND COALESCE(pending_balance, 0) + p_amount >= 0;
  ELSIF p_balance_type = 'arena_currency' THEN
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + p_amount
    WHERE id = p_user_id
      AND COALESCE(arena_currency, 0) + p_amount >= 0;
  ELSE
    RETURN false;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

-- 3. Add partial unique index for idempotency on Stripe payment_intent_id
DROP INDEX IF EXISTS transactions_stripe_payment_intent_id_unique_idx;
CREATE UNIQUE INDEX transactions_stripe_payment_intent_id_unique_idx
  ON public.transactions (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- 4. Add partial unique index for idempotency on stripe_payout_id
DROP INDEX IF EXISTS transactions_stripe_payout_id_unique_idx;
CREATE UNIQUE INDEX transactions_stripe_payout_id_unique_idx
  ON public.transactions (stripe_payout_id)
  WHERE stripe_payout_id IS NOT NULL;

-- 5. Add a processed webhook event log table for idempotency on all Stripe events
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Only admins can view webhook events" ON public.stripe_webhook_events
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- Migration: 00125_withdraw_arena_currency_rpc.sql
-- ============================================================

-- Atomic check-and-deduct for arena currency withdrawals
CREATE OR REPLACE FUNCTION public.withdraw_arena_currency(
  p_user_id uuid,
  p_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.profiles
  SET arena_currency = COALESCE(arena_currency, 0) - p_amount
  WHERE id = p_user_id
    AND COALESCE(arena_currency, 0) >= p_amount;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

-- ============================================================
-- Migration: 00126_fix_kyc_status_constraint.sql
-- ============================================================

-- Drop the old KYC check constraint so we can update values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS kyc_status_check;

-- Add the missing KYC columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason text,
  ADD COLUMN IF NOT EXISTS extracted_dob text;

-- Convert legacy values to the frontend naming
UPDATE public.profiles
SET kyc_status = 'unverified'
WHERE kyc_status = 'not_verified';

-- Re-create the constraint with the correct set of statuses
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_kyc_status_check
  CHECK (kyc_status IS NULL OR kyc_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- ============================================================
-- Migration: 00127_set_kyc_status_default.sql
-- ============================================================

-- Set default KYC status for new profiles
ALTER TABLE public.profiles
  ALTER COLUMN kyc_status SET DEFAULT 'unverified';

-- Backfill any NULL values to unverified
UPDATE public.profiles
SET kyc_status = 'unverified'
WHERE kyc_status IS NULL;

-- Add a not-null constraint to ensure every profile has a status
ALTER TABLE public.profiles
  ALTER COLUMN kyc_status SET NOT NULL;

-- ============================================================
-- Migration: 00128_separate_wallet_balances.sql
-- ============================================================

-- 1. Update distribute_arena_prizes to separate withdrawable cash from arena currency
CREATE OR REPLACE FUNCTION distribute_arena_prizes(
  p_tournament_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_platform_fee numeric;
  v_net_prize numeric;
  v_total_entry_fees numeric;
  v_winner_id uuid;
BEGIN
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  -- 10% platform fee on the prize pool, the rest goes to the winner as withdrawable cash
  v_platform_fee := v_tournament.prize_pool * 0.10;
  v_net_prize := v_tournament.prize_pool - v_platform_fee;

  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id;

  -- Winner gets net prize as withdrawable cash
  IF v_net_prize > 0 THEN
    SELECT winner_id INTO v_winner_id
    FROM match_results
    WHERE tournament_id = p_tournament_id
      AND status = 'confirmed'
    ORDER BY round DESC, created_at DESC
    LIMIT 1;

    IF v_winner_id IS NOT NULL THEN
      UPDATE profiles
      SET available_balance = COALESCE(available_balance, 0) + v_net_prize
      WHERE id = v_winner_id;

      INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
      VALUES (
        v_winner_id,
        'payout',
        v_net_prize,
        'Tournament prize for winning: ' || v_tournament.name,
        'completed',
        p_tournament_id,
        'USD'
      );
    END IF;
  END IF;

  -- Creator gets entry fees as withdrawable cash
  IF v_total_entry_fees > 0 THEN
    UPDATE profiles
    SET available_balance = COALESCE(available_balance, 0) + v_total_entry_fees
    WHERE id = v_tournament.created_by;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (
      v_tournament.created_by,
      'payout',
      v_total_entry_fees,
      'Entry fees collected for tournament: ' || v_tournament.name,
      'completed',
      p_tournament_id,
      'USD'
    );
  END IF;

  -- Platform revenue (10% of prize pool)
  IF v_platform_fee > 0 THEN
    UPDATE platform_settings
    SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;
  END IF;

  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;
END;
$$;

-- 2. Update refund_tournament_entry_fees to refund only arena_currency
CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant record;
  v_tournament record;
BEGIN
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR v_participant IN
    SELECT user_id, amount_paid
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
      AND tp.amount_paid > 0
      AND NOT EXISTS (
        SELECT 1 FROM transactions
        WHERE user_id = tp.user_id
          AND tournament_id = p_tournament_id
          AND type = 'refund'
          AND description NOT LIKE 'Creator refund%'
      )
  LOOP
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + v_participant.amount_paid
    WHERE id = v_participant.user_id;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (
      v_participant.user_id,
      'refund',
      v_participant.amount_paid,
      'Refund for cancelled tournament: ' || v_tournament.name,
      'completed',
      p_tournament_id,
      'AC'
    );
  END LOOP;

  IF v_tournament.prize_pool > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions
      WHERE user_id = v_tournament.created_by
        AND tournament_id = p_tournament_id
        AND type = 'refund'
        AND description LIKE 'Creator refund%'
    ) THEN
      UPDATE profiles
      SET arena_currency = COALESCE(arena_currency, 0) + v_tournament.prize_pool
      WHERE id = v_tournament.created_by;

      INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
      VALUES (
        v_tournament.created_by,
        'refund',
        v_tournament.prize_pool,
        'Creator refund for cancelled tournament: ' || v_tournament.name,
        'completed',
        p_tournament_id,
        'AC'
      );
    END IF;
  END IF;
END;
$$;

-- 3. Create RPC to withdraw from available_balance
CREATE OR REPLACE FUNCTION withdraw_available_balance(
  p_user_id uuid,
  p_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE profiles
  SET available_balance = COALESCE(available_balance, 0) - p_amount
  WHERE id = p_user_id
    AND COALESCE(available_balance, 0) >= p_amount;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

-- 4. Create RPC to withdraw platform revenue (admin only)
CREATE OR REPLACE FUNCTION withdraw_platform_revenue(
  p_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) - p_amount
  WHERE COALESCE(maintenance_balance, 0) >= p_amount;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

-- 5. Add non-withdrawable-deposit tracking (optional: we can enforce via wallet model)
-- No schema change needed; deposits are now arena_currency only, withdrawals come from available_balance.

-- ============================================================
-- Migration: 00129_add_withdrawals_table.sql
-- ============================================================

-- Create withdrawals table for user payout records
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'completed',
  stripe_transfer_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_created
  ON public.withdrawals(user_id, created_at DESC);

-- RLS: users can see their own withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage withdrawals" ON public.withdrawals;
CREATE POLICY "Service role can manage withdrawals"
  ON public.withdrawals
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add a platform revenue withdrawals table for admin (arena's wallet)
CREATE TABLE IF NOT EXISTS public.platform_revenue_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  stripe_transfer_id text,
  status text NOT NULL DEFAULT 'completed',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.platform_revenue_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage platform revenue withdrawals" ON public.platform_revenue_withdrawals;
CREATE POLICY "Admins can manage platform revenue withdrawals"
  ON public.platform_revenue_withdrawals
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Migration: 00130_fix_wallet_balance_units.sql
-- ============================================================

-- 1. Fix distribute_arena_prizes: available_balance is in USD dollars.
--    amount_paid is in AC cents (100 = $1), so convert to dollars for creator payout.
CREATE OR REPLACE FUNCTION distribute_arena_prizes(
  p_tournament_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_platform_fee numeric;
  v_net_prize numeric;
  v_total_entry_fees_cents numeric;
  v_total_entry_fees_dollars numeric;
  v_winner_id uuid;
BEGIN
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  -- 10% platform fee on the prize pool, the rest goes to the winner as withdrawable cash
  v_platform_fee := v_tournament.prize_pool * 0.10;
  v_net_prize := v_tournament.prize_pool - v_platform_fee;

  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees_cents
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id;

  v_total_entry_fees_dollars := v_total_entry_fees_cents / 100.0;

  -- Winner gets net prize as withdrawable cash
  IF v_net_prize > 0 THEN
    SELECT winner_id INTO v_winner_id
    FROM match_results
    WHERE tournament_id = p_tournament_id
      AND status = 'confirmed'
    ORDER BY round DESC, created_at DESC
    LIMIT 1;

    IF v_winner_id IS NULL THEN
      SELECT winner_id INTO v_winner_id
      FROM tournaments
      WHERE id = p_tournament_id;
    END IF;

    IF v_winner_id IS NOT NULL THEN
      UPDATE profiles
      SET available_balance = COALESCE(available_balance, 0) + v_net_prize
      WHERE id = v_winner_id;

      INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
      VALUES (
        v_winner_id,
        'payout',
        v_net_prize,
        'Tournament prize for winning: ' || v_tournament.name,
        'completed',
        p_tournament_id,
        'USD'
      );
    END IF;
  END IF;

  -- Creator gets entry fees as withdrawable cash
  IF v_total_entry_fees_dollars > 0 THEN
    UPDATE profiles
    SET available_balance = COALESCE(available_balance, 0) + v_total_entry_fees_dollars
    WHERE id = v_tournament.created_by;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (
      v_tournament.created_by,
      'payout',
      v_total_entry_fees_dollars,
      'Entry fees collected for tournament: ' || v_tournament.name,
      'completed',
      p_tournament_id,
      'USD'
    );
  END IF;

  -- Platform revenue (10% of prize pool)
  IF v_platform_fee > 0 THEN
    UPDATE platform_settings
    SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;
  END IF;

  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;
END;
$$;

-- 2. Fix refund_tournament_entry_fees: arena_currency is in AC cents (100 = $1).
--    prize_pool is in dollars, so convert to cents for creator refund.
CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant record;
  v_tournament record;
BEGIN
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR v_participant IN
    SELECT user_id, amount_paid
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
      AND tp.amount_paid > 0
      AND NOT EXISTS (
        SELECT 1 FROM transactions
        WHERE user_id = tp.user_id
          AND tournament_id = p_tournament_id
          AND type = 'refund'
          AND description NOT LIKE 'Creator refund%'
      )
  LOOP
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + v_participant.amount_paid
    WHERE id = v_participant.user_id;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (
      v_participant.user_id,
      'refund',
      v_participant.amount_paid,
      'Refund for cancelled tournament: ' || v_tournament.name,
      'completed',
      p_tournament_id,
      'AC'
    );
  END LOOP;

  IF v_tournament.prize_pool > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions
      WHERE user_id = v_tournament.created_by
        AND tournament_id = p_tournament_id
        AND type = 'refund'
        AND description LIKE 'Creator refund%'
    ) THEN
      UPDATE profiles
      SET arena_currency = COALESCE(arena_currency, 0) + (v_tournament.prize_pool * 100)
      WHERE id = v_tournament.created_by;

      INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
      VALUES (
        v_tournament.created_by,
        'refund',
        v_tournament.prize_pool * 100,
        'Creator refund for cancelled tournament: ' || v_tournament.name,
        'completed',
        p_tournament_id,
        'AC'
      );
    END IF;
  END IF;
END;
$$;

-- 3. Fix distribute_challenge_prizes: only add withdrawable cash (available_balance), not arena_currency.
--    prize_pool is in dollars, so add to available_balance (dollars) directly.
CREATE OR REPLACE FUNCTION distribute_challenge_prizes(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge record;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_challenge.status != 'completed' OR v_challenge.winner_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'challenge_win') THEN
    RETURN;
  END IF;

  -- Prize pool goes to winner as withdrawable cash only
  UPDATE profiles
  SET
    available_balance = COALESCE(available_balance, 0) + v_challenge.prize_pool,
    total_earnings = COALESCE(total_earnings, 0) + v_challenge.prize_pool,
    wins = COALESCE(wins, 0) + 1
  WHERE id = v_challenge.winner_id;

  UPDATE profiles
  SET losses = COALESCE(losses, 0) + 1
  WHERE id = CASE
    WHEN v_challenge.winner_id = v_challenge.challenger_id THEN v_challenge.opponent_id
    ELSE v_challenge.challenger_id
  END;

  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
  VALUES (
    v_challenge.winner_id,
    'challenge_win',
    v_challenge.prize_pool,
    'Quick Match prize for winning: ' || v_challenge.game,
    'completed',
    p_challenge_id
  );

  -- Platform fee to platform revenue
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_challenge.platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);
END;
$$;

-- 4. Ensure withdraw_available_balance works with dollars
CREATE OR REPLACE FUNCTION withdraw_available_balance(
  p_user_id uuid,
  p_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE profiles
  SET available_balance = COALESCE(available_balance, 0) - p_amount
  WHERE id = p_user_id
    AND COALESCE(available_balance, 0) >= p_amount;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

-- 5. Ensure withdraw_platform_revenue works with dollars
CREATE OR REPLACE FUNCTION withdraw_platform_revenue(
  p_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) - p_amount
  WHERE COALESCE(maintenance_balance, 0) >= p_amount;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

-- ============================================================
-- Migration: 00131_refund_pending_manual_withdrawals.sql
-- ============================================================

-- Refund the two manual-settlement withdrawals that did not create a Stripe transfer
DO $$
DECLARE
  v_user_id uuid := 'db9a7c94-d4ef-4af2-8e2b-f9e8c9ebae4b';
  v_total numeric := 0;
  v_tx record;
BEGIN
  FOR v_tx IN
    SELECT id, amount
    FROM transactions
    WHERE user_id = v_user_id
      AND type = 'withdrawal'
      AND status = 'pending'
      AND stripe_payout_id LIKE 'manual_%'
  LOOP
    v_total := v_total + v_tx.amount;
    UPDATE transactions
    SET status = 'failed',
        description = description || ' [refunded: Stripe transfer did not occur]',
        updated_at = now()
    WHERE id = v_tx.id;
  END LOOP;

  IF v_total > 0 THEN
    UPDATE profiles
    SET available_balance = COALESCE(available_balance, 0) + v_total
    WHERE id = v_user_id;
  END IF;
END $$;

-- ============================================================
-- Migration: 00132_revert_refund_manual_withdrawals.sql
-- ============================================================

-- Revert the refund and mark the transactions back to pending/manual
DO $$
DECLARE
  v_user_id uuid := 'db9a7c94-d4ef-4af2-8e2b-f9e8c9ebae4b';
  v_total numeric := 0;
  v_tx record;
BEGIN
  FOR v_tx IN
    SELECT id, amount
    FROM transactions
    WHERE user_id = v_user_id
      AND type = 'withdrawal'
      AND status = 'failed'
      AND stripe_payout_id LIKE 'manual_%'
  LOOP
    v_total := v_total + v_tx.amount;
    UPDATE transactions
    SET status = 'pending',
        description = 'Withdrawal (manual settlement — test mode)',
        updated_at = now()
    WHERE id = v_tx.id;
  END LOOP;

  IF v_total > 0 THEN
    UPDATE profiles
    SET available_balance = COALESCE(available_balance, 0) - v_total
    WHERE id = v_user_id;
  END IF;
END $$;
