-- The app already listens for these tables; they were never published to Realtime,
-- so the bell, friend requests and referee-application chat only updated on reload.
-- Each table's RLS limits rows to their owner, and Realtime applies RLS per subscriber.
-- (profiles is deliberately NOT added: it holds private columns.)
alter publication supabase_realtime add table public.notifications, public.friend_requests, public.friendships, public.referee_application_messages;
