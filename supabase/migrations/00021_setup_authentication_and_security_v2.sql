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