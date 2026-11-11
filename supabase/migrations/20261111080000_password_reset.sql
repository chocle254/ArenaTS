-- Forgot password: the reset-password edge function (service role only) looks up
-- the account by email and signs out every device after the password changes.
create or replace function public.password_reset_user_id(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from auth.users
  where lower(email) = lower(btrim(p_email)) and deleted_at is null
  limit 1
$$;

create or replace function public.revoke_user_sessions(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = p_user
$$;

revoke all on function public.password_reset_user_id(text) from public, anon, authenticated;
revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.password_reset_user_id(text) to service_role;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
