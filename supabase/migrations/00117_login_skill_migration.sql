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
