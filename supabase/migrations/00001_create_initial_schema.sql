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