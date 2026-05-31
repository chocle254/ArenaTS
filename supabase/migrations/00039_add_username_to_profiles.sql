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
