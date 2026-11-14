-- Player reports from chats, and admin access to reported private chats.
--
-- 1. Reports say where they came from (private chat, World Chat, profile). A
--    World Chat report keeps a copy of the reported message, because World
--    Chat is cleared after 7 days. Players can't set a report's status, and
--    can file at most 10 reports a day.
-- 2. Admins can only open a private conversation when one of the two players
--    reported the other from that chat, and every opening is logged
--    (privacy policy 2.2).

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'profile',
  ADD COLUMN IF NOT EXISTS message_id uuid,
  ADD COLUMN IF NOT EXISTS message_excerpt text,
  ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_source_check;
ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_source_check CHECK (source IN ('dm', 'world', 'profile'));

CREATE OR REPLACE FUNCTION public.guard_user_report()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  w record;
BEGIN
  -- Server jobs and the dashboard have no player id; players always do
  -- (current_user can't be used: this function runs as its owner)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.reporter_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only report as yourself' USING ERRCODE = '42501';
  END IF;
  NEW.status := 'pending';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.admin_note := NULL;
  NEW.created_at := now();
  NEW.description := left(btrim(COALESCE(NEW.description, '')), 1000);
  IF (SELECT count(*) FROM user_reports WHERE reporter_id = NEW.reporter_id AND created_at > now() - interval '24 hours') >= 10 THEN
    RAISE EXCEPTION 'You''ve sent a lot of reports today. Our team is reviewing them; try again tomorrow.';
  END IF;

  NEW.message_excerpt := NULL;
  IF NEW.source = 'world' THEN
    SELECT user_id, message INTO w FROM world_chat_messages WHERE id = NEW.message_id;
    IF NOT FOUND OR w.user_id IS DISTINCT FROM NEW.reported_user_id THEN
      RAISE EXCEPTION 'That message isn''t available any more';
    END IF;
    NEW.message_excerpt := left(w.message, 500);
  ELSIF NEW.source = 'dm' THEN
    NEW.message_id := NULL;
    IF NOT EXISTS (
      SELECT 1 FROM direct_messages
      WHERE (sender_id = NEW.reporter_id AND receiver_id = NEW.reported_user_id)
         OR (sender_id = NEW.reported_user_id AND receiver_id = NEW.reporter_id)
    ) THEN
      RAISE EXCEPTION 'You haven''t chatted with this player';
    END IF;
  ELSE
    NEW.message_id := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS a_guard_user_report ON public.user_reports;
CREATE TRIGGER a_guard_user_report BEFORE INSERT ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_report();

-- Who opened which private chat, when, and because of which report
CREATE TABLE IF NOT EXISTS public.dm_access_log (
  id bigserial PRIMARY KEY,
  admin_id uuid NOT NULL,
  player_a uuid NOT NULL,
  player_b uuid NOT NULL,
  report_id uuid,
  opened_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dm_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dm_access_log FROM anon, authenticated;
GRANT SELECT ON public.dm_access_log TO authenticated;
DROP POLICY IF EXISTS dm_access_log_admin_read ON public.dm_access_log;
CREATE POLICY dm_access_log_admin_read ON public.dm_access_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Replaces the earlier version: now needs a private-chat report between the two
DROP FUNCTION IF EXISTS public.admin_dm_thread(uuid, uuid, integer);
CREATE OR REPLACE FUNCTION public.admin_dm_thread(p_report uuid, p_limit integer DEFAULT 300)
 RETURNS TABLE (id uuid, sender_id uuid, receiver_id uuid, message text, image_url text, created_at timestamptz,
                read_at timestamptz, edited_at timestamptz, deleted_at timestamptz,
                parent_message_id uuid, reply_message text, reply_sender_id uuid, reply_deleted boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r user_reports%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM user_reports WHERE user_reports.id = p_report;
  IF NOT FOUND OR r.source <> 'dm' THEN
    RAISE EXCEPTION 'Private chats can only be opened from a report made in that chat' USING ERRCODE = '42501';
  END IF;
  INSERT INTO dm_access_log (admin_id, player_a, player_b, report_id) VALUES (auth.uid(), r.reporter_id, r.reported_user_id, r.id);
  RETURN QUERY
  SELECT x.* FROM public._dm_rows(ARRAY(
    SELECT d.id FROM direct_messages d
    WHERE (d.sender_id = r.reporter_id AND d.receiver_id = r.reported_user_id)
       OR (d.sender_id = r.reported_user_id AND d.receiver_id = r.reporter_id)
    ORDER BY d.created_at DESC LIMIT LEAST(COALESCE(p_limit, 300), 1000)
  )) x ORDER BY x.created_at;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_dm_thread(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dm_thread(uuid, integer) TO authenticated;
