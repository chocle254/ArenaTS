-- The chat guard ran as owner, so it couldn't tell a player's direct insert
-- from a server function posting a system message during that player's
-- request (e.g. the AI referee acknowledging evidence). Run it as the caller:
-- only direct inserts from the app (current_user = authenticated) are checked.
CREATE OR REPLACE FUNCTION public.guard_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_col text := TG_ARGV[0];
  v_max int := TG_ARGV[1]::int;
  v_per_30s int := TG_ARGV[2]::int;
  v_row jsonb := to_jsonb(NEW);
  v_recent int;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF (v_row ->> v_col)::uuid IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You can only send messages as yourself' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(COALESCE(v_row ->> 'message', ''))) = 0 AND COALESCE(v_row ->> 'image_url', '') = '' THEN
    RAISE EXCEPTION 'Message is empty';
  END IF;
  IF char_length(COALESCE(v_row ->> 'message', '')) > v_max THEN
    RAISE EXCEPTION 'Message is too long (max % characters)', v_max;
  END IF;
  EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I = $1 AND created_at > now() - interval ''30 seconds''',
                 TG_TABLE_SCHEMA, TG_TABLE_NAME, v_col)
    INTO v_recent USING v_uid;
  IF v_recent >= v_per_30s THEN
    RAISE EXCEPTION 'You''re sending messages too fast. Wait a few seconds.';
  END IF;
  IF v_row ? 'is_system_message' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('is_system_message', false));
  END IF;
  IF v_row ? 'is_admin' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('is_admin', has_role(v_uid, 'admin')));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_friend_request()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.sender_id = NEW.receiver_id THEN
      RAISE EXCEPTION 'You can''t add yourself as a friend';
    END IF;
    NEW.status := 'pending';
    NEW.created_at := now();
    IF (SELECT count(*) FROM friend_requests WHERE sender_id = NEW.sender_id AND created_at > now() - interval '1 hour') >= 30 THEN
      RAISE EXCEPTION 'You''ve sent a lot of friend requests. Try again later.';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the request''s status can change' USING ERRCODE = '42501';
  END IF;
  IF NEW.status NOT IN ('pending', 'accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  RETURN NEW;
END;
$$;
