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