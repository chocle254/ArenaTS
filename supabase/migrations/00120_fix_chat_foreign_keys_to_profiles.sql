-- Drop old foreign keys pointing to auth.users
ALTER TABLE public.world_chat_messages DROP CONSTRAINT IF EXISTS world_chat_messages_user_id_fkey;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_sender_id_fkey;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_receiver_id_fkey;

-- Add new foreign keys pointing to public.profiles
ALTER TABLE public.world_chat_messages
ADD CONSTRAINT world_chat_messages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.direct_messages
ADD CONSTRAINT direct_messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.direct_messages
ADD CONSTRAINT direct_messages_receiver_id_fkey
FOREIGN KEY (receiver_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
