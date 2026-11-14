-- Chat upgrade: encrypted direct messages, replies, reactions, edit and delete.
--
-- 1. Direct messages are stored encrypted (pgp_sym_encrypt, key in Supabase
--    Vault, so a copy of the table or a backup shows ciphertext). Players read
--    them through dm_thread / dm_get / dm_inbox, which only return their own
--    conversations. Arena can still decrypt (admin_dm_thread) to act on reports.
-- 2. Players could previously UPDATE any column of messages they received
--    (including the text). Direct updates are gone; read receipts, edits and
--    deletes go through checked functions.
-- 3. Replies (DMs already had parent_message_id; World Chat gets reply_to_id),
--    emoji reactions for both, edit within 15 minutes and delete for everyone.

SET LOCAL lock_timeout = '5s';

-- Key in Vault
SELECT vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'dm_message_key', 'Encrypts direct messages at rest')
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'dm_message_key');

CREATE OR REPLACE FUNCTION public._dm_key()
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'dm_message_key' LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public._dm_key() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS body_enc bytea,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.direct_messages ALTER COLUMN message DROP NOT NULL;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_parent_message_id_fkey;
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_parent_message_id_fkey
  FOREIGN KEY (parent_message_id) REFERENCES public.direct_messages(id) ON DELETE SET NULL;

-- Encrypt on the way in (runs after a_guard_chat_message has checked the text)
CREATE OR REPLACE FUNCTION public.dm_encrypt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM direct_messages d WHERE d.id = NEW.parent_message_id
      AND ((d.sender_id = NEW.sender_id AND d.receiver_id = NEW.receiver_id) OR (d.sender_id = NEW.receiver_id AND d.receiver_id = NEW.sender_id))
  ) THEN
    NEW.parent_message_id := NULL;
  END IF;
  IF NEW.message IS NOT NULL THEN
    NEW.body_enc := extensions.pgp_sym_encrypt(NEW.message, public._dm_key());
    NEW.message := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS b_dm_encrypt ON public.direct_messages;
CREATE TRIGGER b_dm_encrypt BEFORE INSERT OR UPDATE OF message ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.dm_encrypt();

-- Encrypt what's already there
UPDATE public.direct_messages SET message = message WHERE message IS NOT NULL;

-- No more direct updates from the app
DROP POLICY IF EXISTS "Users can mark their received DMs as read" ON public.direct_messages;
REVOKE UPDATE, DELETE, TRUNCATE ON public.direct_messages FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public._dm_text(p_enc bytea, p_deleted timestamptz)
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_deleted IS NULL AND p_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(p_enc, public._dm_key()) END;
$function$;
REVOKE ALL ON FUNCTION public._dm_text(bytea, timestamptz) FROM PUBLIC, anon, authenticated;

-- One readable message row
CREATE OR REPLACE FUNCTION public._dm_rows(p_ids uuid[])
 RETURNS TABLE (id uuid, sender_id uuid, receiver_id uuid, message text, image_url text, created_at timestamptz,
                read_at timestamptz, edited_at timestamptz, deleted_at timestamptz,
                parent_message_id uuid, reply_message text, reply_sender_id uuid, reply_deleted boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.id, d.sender_id, d.receiver_id, public._dm_text(d.body_enc, d.deleted_at),
         CASE WHEN d.deleted_at IS NULL THEN d.image_url END, d.created_at, d.read_at, d.edited_at, d.deleted_at,
         d.parent_message_id, left(public._dm_text(p.body_enc, p.deleted_at), 140), p.sender_id, p.deleted_at IS NOT NULL
  FROM direct_messages d
  LEFT JOIN direct_messages p ON p.id = d.parent_message_id
  WHERE d.id = ANY(p_ids);
$function$;
REVOKE ALL ON FUNCTION public._dm_rows(uuid[]) FROM PUBLIC, anon, authenticated;

-- A conversation, newest first (the app reverses it)
CREATE OR REPLACE FUNCTION public.dm_thread(p_other uuid, p_before timestamptz DEFAULT NULL, p_limit integer DEFAULT 100)
 RETURNS TABLE (id uuid, sender_id uuid, receiver_id uuid, message text, image_url text, created_at timestamptz,
                read_at timestamptz, edited_at timestamptz, deleted_at timestamptz,
                parent_message_id uuid, reply_message text, reply_sender_id uuid, reply_deleted boolean)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '28000';
  END IF;
  RETURN QUERY
  SELECT r.* FROM public._dm_rows(ARRAY(
    SELECT d.id FROM direct_messages d
    WHERE ((d.sender_id = v_me AND d.receiver_id = p_other) OR (d.sender_id = p_other AND d.receiver_id = v_me))
      AND (p_before IS NULL OR d.created_at < p_before)
    ORDER BY d.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200)
  )) r
  ORDER BY r.created_at DESC;
END;
$function$;
REVOKE ALL ON FUNCTION public.dm_thread(uuid, timestamptz, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_thread(uuid, timestamptz, integer) TO authenticated;

-- One message (after a realtime event)
CREATE OR REPLACE FUNCTION public.dm_get(p_id uuid)
 RETURNS TABLE (id uuid, sender_id uuid, receiver_id uuid, message text, image_url text, created_at timestamptz,
                read_at timestamptz, edited_at timestamptz, deleted_at timestamptz,
                parent_message_id uuid, reply_message text, reply_sender_id uuid, reply_deleted boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.* FROM public._dm_rows(ARRAY[p_id]) r
  WHERE auth.uid() IN (r.sender_id, r.receiver_id);
$function$;
REVOKE ALL ON FUNCTION public.dm_get(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_get(uuid) TO authenticated;

-- Inbox: last message and unread count per conversation
CREATE OR REPLACE FUNCTION public.dm_inbox()
 RETURNS TABLE (other_id uuid, id uuid, sender_id uuid, receiver_id uuid, message text, image_url text, created_at timestamptz,
                read_at timestamptz, deleted_at timestamptz, unread_count integer)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH mine AS (
    SELECT d.*, CASE WHEN d.sender_id = auth.uid() THEN d.receiver_id ELSE d.sender_id END AS other
    FROM direct_messages d
    WHERE auth.uid() IN (d.sender_id, d.receiver_id)
  ),
  last AS (
    SELECT DISTINCT ON (other) * FROM mine ORDER BY other, created_at DESC
  ),
  unread AS (
    SELECT other, count(*)::int AS n FROM mine
    WHERE receiver_id = auth.uid() AND read_at IS NULL AND deleted_at IS NULL
    GROUP BY other
  )
  SELECT l.other, l.id, l.sender_id, l.receiver_id, left(public._dm_text(l.body_enc, l.deleted_at), 200),
         CASE WHEN l.deleted_at IS NULL THEN l.image_url END, l.created_at, l.read_at, l.deleted_at, COALESCE(u.n, 0)
  FROM last l LEFT JOIN unread u ON u.other = l.other
  ORDER BY l.created_at DESC
  LIMIT 100;
$function$;
REVOKE ALL ON FUNCTION public.dm_inbox() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_inbox() TO authenticated;

CREATE OR REPLACE FUNCTION public.dm_mark_read(p_other uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  n int;
BEGIN
  UPDATE direct_messages SET read_at = now()
  WHERE sender_id = p_other AND receiver_id = auth.uid() AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;
REVOKE ALL ON FUNCTION public.dm_mark_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_mark_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dm_edit(p_id uuid, p_text text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d direct_messages%ROWTYPE;
  v text := btrim(COALESCE(p_text, ''));
BEGIN
  SELECT * INTO d FROM direct_messages WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR d.sender_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only edit your own messages' USING ERRCODE = '42501';
  END IF;
  IF d.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This message was deleted';
  END IF;
  IF d.created_at < now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'Messages can only be edited for 15 minutes';
  END IF;
  IF char_length(v) = 0 OR char_length(v) > 2000 THEN
    RAISE EXCEPTION 'A message needs 1 to 2000 characters';
  END IF;
  UPDATE direct_messages SET message = v, edited_at = now() WHERE id = p_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.dm_edit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_edit(uuid, text) TO authenticated;

-- Delete for everyone: the text and photo are gone, a "deleted" marker stays
CREATE OR REPLACE FUNCTION public.dm_delete(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE direct_messages SET deleted_at = now(), body_enc = NULL, message = NULL, image_url = NULL
  WHERE id = p_id AND sender_id = auth.uid() AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You can only delete your own messages' USING ERRCODE = '42501';
  END IF;
  DELETE FROM message_reactions WHERE kind = 'dm' AND message_id = p_id;
END;
$function$;

-- Reports: admins can read a conversation
CREATE OR REPLACE FUNCTION public.admin_dm_thread(p_a uuid, p_b uuid, p_limit integer DEFAULT 200)
 RETURNS TABLE (id uuid, sender_id uuid, receiver_id uuid, message text, image_url text, created_at timestamptz,
                read_at timestamptz, edited_at timestamptz, deleted_at timestamptz,
                parent_message_id uuid, reply_message text, reply_sender_id uuid, reply_deleted boolean)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.* FROM public._dm_rows(ARRAY(
    SELECT d.id FROM direct_messages d
    WHERE (d.sender_id = p_a AND d.receiver_id = p_b) OR (d.sender_id = p_b AND d.receiver_id = p_a)
    ORDER BY d.created_at DESC LIMIT LEAST(COALESCE(p_limit, 200), 1000)
  )) r ORDER BY r.created_at;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_dm_thread(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dm_thread(uuid, uuid, integer) TO authenticated;

-- World Chat replies
ALTER TABLE public.world_chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.world_chat_messages(id) ON DELETE SET NULL;

-- Reactions (one per player per message, WhatsApp-style)
CREATE TABLE IF NOT EXISTS public.message_reactions (
  kind text NOT NULL CHECK (kind IN ('dm', 'world')),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('👍', '❤️', '😂', '😮', '😢', '🔥')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, message_id, user_id)
);
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_reactions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;

CREATE OR REPLACE FUNCTION public._can_see_message(p_kind text, p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE p_kind
    WHEN 'world' THEN EXISTS (SELECT 1 FROM world_chat_messages w WHERE w.id = p_id)
    WHEN 'dm' THEN EXISTS (SELECT 1 FROM direct_messages d WHERE d.id = p_id AND d.deleted_at IS NULL AND auth.uid() IN (d.sender_id, d.receiver_id))
    ELSE false END;
$function$;
REVOKE ALL ON FUNCTION public._can_see_message(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._can_see_message(text, uuid) TO authenticated;

DROP POLICY IF EXISTS reactions_read ON public.message_reactions;
CREATE POLICY reactions_read ON public.message_reactions FOR SELECT TO authenticated
  USING (kind = 'world' OR public._can_see_message(kind, message_id));
DROP POLICY IF EXISTS reactions_add ON public.message_reactions;
CREATE POLICY reactions_add ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public._can_see_message(kind, message_id));
DROP POLICY IF EXISTS reactions_change ON public.message_reactions;
CREATE POLICY reactions_change ON public.message_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public._can_see_message(kind, message_id));
DROP POLICY IF EXISTS reactions_remove ON public.message_reactions;
CREATE POLICY reactions_remove ON public.message_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.dm_delete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_delete(uuid) TO authenticated;

-- Nightly World Chat cleanup also clears reactions on removed messages
SELECT cron.unschedule('world-chat-7-day-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'world-chat-7-day-cleanup');
SELECT cron.schedule('world-chat-7-day-cleanup', '30 3 * * *', $$
  DELETE FROM public.world_chat_messages WHERE created_at < now() - interval '7 days';
  DELETE FROM public.message_reactions r WHERE r.kind = 'world' AND NOT EXISTS (SELECT 1 FROM public.world_chat_messages w WHERE w.id = r.message_id);
$$);
