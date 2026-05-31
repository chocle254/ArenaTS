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