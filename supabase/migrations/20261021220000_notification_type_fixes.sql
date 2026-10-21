-- Some server functions passed notification types the table's check constraint
-- rejects ('referee' from _assign_referee, team_invite_declined,
-- team_invite_expired, tournament_reminder). The whole action then failed:
-- referee assignment never succeeded, nor did declining/expiring team invites
-- or reminders. Unknown types now map to 'tournament' or 'system'.
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_link IS NOT NULL AND (left(p_link, 1) <> '/' OR left(p_link, 2) = '//' OR position('\' in p_link) > 0) THEN
    p_link := NULL;
  END IF;
  IF p_type IS NULL OR p_type NOT IN ('tournament', 'match', 'payment', 'system', 'challenge_received', 'tournament_live', 'mention', 'direct_message') THEN
    p_type := 'system';
  END IF;
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, left(COALESCE(p_title, ''), 120), left(COALESCE(p_message, ''), 500), p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.normalize_notification_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.type IS NULL OR NEW.type NOT IN ('tournament', 'match', 'payment', 'system', 'challenge_received', 'tournament_live', 'mention', 'direct_message') THEN
    NEW.type := CASE
      WHEN NEW.type LIKE 'tournament%' OR NEW.type LIKE 'team%' THEN 'tournament'
      ELSE 'system'
    END;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.normalize_notification_type() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS a_normalize_notification_type ON public.notifications;
CREATE TRIGGER a_normalize_notification_type BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.normalize_notification_type();
