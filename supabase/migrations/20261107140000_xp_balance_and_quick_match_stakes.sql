-- Applied to production via MCP on 2026-11-07 (migration "xp_balance_and_quick_match_stakes").
-- XP becomes a stored balance. Quick matches can stake XP: the winner takes the loser's stake.
-- Tournaments still give +150 XP for taking part. Below 100 XP you get a free top-up to 100 once a day.
alter table public.profiles add column if not exists xp integer not null default 100;
alter table public.profiles add column if not exists xp_topup_at timestamptz;
alter table public.profiles add constraint profiles_xp_nonnegative check (xp >= 0) not valid;
update public.profiles set xp = coalesce(wins, 0) * 100 + coalesce(losses, 0) * 25 + coalesce(tournaments_played, 0) * 150;
grant select (xp) on public.profiles to authenticated;

alter table public.challenges add column if not exists stake_xp integer not null default 0;
alter table public.challenges add constraint challenges_stake_xp_check check (stake_xp >= 0 and stake_xp <= 100000) not valid;

-- Only the server moves XP
create or replace function public.protect_profile_xp() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if current_setting('app.bypass_profile_protection', true) = 'true' or current_user not in ('authenticated', 'anon') or pg_trigger_depth() > 1 then
    return new;
  end if;
  if exists (select 1 from profiles where id = auth.uid() and role = 'admin') then return new; end if;
  if new.xp is distinct from old.xp or new.xp_topup_at is distinct from old.xp_topup_at then
    raise exception 'Unauthorized attempt to modify sensitive account fields (xp).' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_xp on public.profiles;
create trigger protect_profile_xp before update on public.profiles for each row execute function public.protect_profile_xp();

-- Challenge with an XP stake
drop function if exists public.create_challenge(uuid, text, numeric, uuid, uuid);
create function public.create_challenge(p_opponent_id uuid, p_game text, p_stake numeric, p_opponent_team_id uuid default null, p_challenger_team_id uuid default null, p_stake_xp integer default 0)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_balance numeric;
  v_opponent_tag text;
  v_total numeric;
  v_fee numeric;
  v_challenge_id uuid;
  v_stakes_on boolean;
  v_xp int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '28000'; end if;
  if p_opponent_id is null or p_opponent_id = v_uid then raise exception 'Choose another player to challenge'; end if;
  select gamertag into v_opponent_tag from profiles where id = p_opponent_id;
  if not found then raise exception 'That player no longer exists'; end if;
  if exists (select 1 from profiles where id = v_uid and coalesce(is_suspended, false)) then
    raise exception 'Your account is under review. Try again later.';
  end if;
  if (select count(*) from challenges where challenger_id = v_uid and status = 'pending' and expires_at > now()) >= 5 then
    raise exception 'You have 5 challenges waiting for an answer. Wait for one to be accepted or expire.';
  end if;

  p_stake_xp := greatest(coalesce(p_stake_xp, 0), 0);
  if p_stake_xp > 0 then
    select coalesce(xp, 0) into v_xp from profiles where id = v_uid;
    if v_xp < p_stake_xp then raise exception 'You have % XP, so you can stake up to % XP', v_xp, v_xp; end if;
    select coalesce(xp, 0) into v_xp from profiles where id = p_opponent_id;
    if v_xp < p_stake_xp then raise exception '% only has % XP. Stake % XP or less.', v_opponent_tag, v_xp, v_xp; end if;
  end if;

  p_stake := round(coalesce(p_stake, 0));
  select coalesce(quick_match_stakes_enabled, false) into v_stakes_on from platform_settings limit 1;

  if p_stake = 0 or not coalesce(v_stakes_on, false) then
    if p_stake > 0 then raise exception 'Quick matches are free for now. Play for XP and rank.'; end if;
    insert into challenges (challenger_id, opponent_id, game, stake_amount, prize_pool, platform_fee, expires_at, status, challenger_team_id, opponent_team_id, stake_xp)
    values (v_uid, p_opponent_id, p_game, 0, 0, 0, now() + interval '5 minutes', 'pending', p_challenger_team_id, p_opponent_team_id, p_stake_xp)
    returning id into v_challenge_id;
    return v_challenge_id;
  end if;

  perform _check_pair_limits(v_uid, p_opponent_id, p_stake);
  select coalesce(arena_currency, 0) into v_balance from profiles where id = v_uid for update;
  if v_balance < p_stake then raise exception 'Not enough in your play balance. Top up with M-Pesa first.'; end if;
  v_total := p_stake * 2;
  v_fee := round(v_total * 0.10, 2);
  perform set_config('app.bypass_profile_protection', 'true', true);
  update profiles set arena_currency = coalesce(arena_currency, 0) - p_stake where id = v_uid;
  insert into challenges (challenger_id, opponent_id, game, stake_amount, prize_pool, platform_fee, expires_at, status, challenger_team_id, opponent_team_id, stake_xp)
  values (v_uid, p_opponent_id, p_game, p_stake, v_total - v_fee, v_fee, now() + interval '5 minutes', 'pending', p_challenger_team_id, p_opponent_team_id, p_stake_xp)
  returning id into v_challenge_id;
  insert into transactions (user_id, type, amount, description, status, challenge_id, currency)
  values (v_uid, 'challenge_fee', -p_stake, 'Stake for challenge to: ' || coalesce(v_opponent_tag, 'player'), 'completed', v_challenge_id, 'KES');
  return v_challenge_id;
end;
$function$;
revoke all on function public.create_challenge(uuid, text, numeric, uuid, uuid, integer) from public, anon;
grant execute on function public.create_challenge(uuid, text, numeric, uuid, uuid, integer) to authenticated;

-- Accepting needs enough XP for the stake
create or replace function public.accept_challenge(p_challenge_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_challenge record;
  v_balance numeric;
  v_challenger_tag text;
  v_xp int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '28000'; end if;
  select * into v_challenge from challenges where id = p_challenge_id for update;
  if not found then raise exception 'Challenge not found'; end if;
  if v_challenge.opponent_id <> v_uid then raise exception 'This challenge was not sent to you' using errcode = '42501'; end if;
  if v_challenge.status <> 'pending' then raise exception 'This challenge is no longer open'; end if;
  if v_challenge.expires_at is not null and v_challenge.expires_at <= now() then raise exception 'Challenge expired'; end if;
  if exists (select 1 from profiles where id = v_uid and (coalesce(is_flagged_fraud, false) or coalesce(is_suspended, false))) then
    raise exception 'Your account is under review. Try again later.';
  end if;
  if coalesce(v_challenge.stake_xp, 0) > 0 then
    select coalesce(xp, 0) into v_xp from profiles where id = v_uid;
    if v_xp < v_challenge.stake_xp then raise exception 'You need % XP to accept this challenge (you have %)', v_challenge.stake_xp, v_xp; end if;
  end if;

  if coalesce(v_challenge.stake_amount, 0) > 0 then
    select coalesce(arena_currency, 0) into v_balance from profiles where id = v_uid for update;
    if v_balance < v_challenge.stake_amount then raise exception 'Not enough in your play balance. Top up with M-Pesa first.'; end if;
    select gamertag into v_challenger_tag from profiles where id = v_challenge.challenger_id;
    perform set_config('app.bypass_profile_protection', 'true', true);
    update profiles set arena_currency = coalesce(arena_currency, 0) - v_challenge.stake_amount where id = v_uid;
    insert into transactions (user_id, type, amount, description, status, challenge_id, currency)
    values (v_uid, 'challenge_fee', -v_challenge.stake_amount, 'Stake for challenge from: ' || coalesce(v_challenger_tag, 'player'), 'completed', p_challenge_id, 'KES');
  end if;

  update challenges set status = 'accepted', accepted_at = now() where id = p_challenge_id;
end;
$function$;

-- Result: the winner takes the loser's XP stake (never below 0). Wins/losses still count for stats.
create or replace function public.distribute_challenge_prizes(p_challenge_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $function$
declare
  c record;
  v_loser uuid;
  v_games int;
  v_winner_wins int;
  v_pot_total numeric;
  v_status text := 'held';
  v_reason text;
  v_recent_deposit numeric;
  v_link text;
  v_counted_today int;
  v_take int;
begin
  select * into c from challenges where id = p_challenge_id for update;
  if not found or c.status <> 'completed' or c.winner_id is null or c.xp_counted is not null then return; end if;
  if exists (select 1 from transactions where challenge_id = p_challenge_id and type = 'challenge_win') then return; end if;
  v_loser := case when c.winner_id = c.challenger_id then c.opponent_id else c.challenger_id end;

  -- XP stake and stats: first 3 a day per pair, so friends can't farm each other
  select count(*) into v_counted_today from challenges
  where xp_counted and completed_at > now() - interval '24 hours'
    and ((challenger_id = c.challenger_id and opponent_id = c.opponent_id) or (challenger_id = c.opponent_id and opponent_id = c.challenger_id));
  perform set_config('app.bypass_profile_protection', 'true', true);
  if v_counted_today < 3 then
    select least(coalesce(c.stake_xp, 0), coalesce(xp, 0)) into v_take from profiles where id = v_loser for update;
    update profiles set wins = coalesce(wins, 0) + 1, xp = coalesce(xp, 0) + v_take where id = c.winner_id;
    update profiles set losses = coalesce(losses, 0) + 1, xp = coalesce(xp, 0) - v_take where id = v_loser;
    update challenges set xp_counted = true where id = c.id;
  else
    update challenges set xp_counted = false where id = c.id;
  end if;

  if coalesce(c.stake_amount, 0) = 0 then return; end if;

  -- Money match (only possible when stakes are switched on)
  select count(*), count(*) filter (where winner_id = c.winner_id), coalesce(sum(prize_pool), 0)
  into v_games, v_winner_wins, v_pot_total
  from challenges
  where status = 'completed' and stake_amount > 0
    and ((challenger_id = c.challenger_id and opponent_id = c.opponent_id) or (challenger_id = c.opponent_id and opponent_id = c.challenger_id))
    and completed_at > now() - interval '30 days';
  if v_games >= 3 and v_winner_wins = v_games and v_pot_total >= 1500 then
    v_status := 'frozen';
    v_reason := 'Same opponent lost every money match in 30 days';
    perform _flag(c.winner_id, 'one_sided_pair', jsonb_build_object('opponent', v_loser, 'matches', v_games, 'pot_total', v_pot_total));
  end if;
  select coalesce(sum(credit), 0) into v_recent_deposit from mpesa_deposits
  where user_id = v_loser and status = 'completed' and completed_at > now() - interval '2 hours';
  if v_recent_deposit > 0 and c.stake_amount >= 0.8 * v_recent_deposit and c.stake_amount >= 1000 then
    v_status := 'frozen';
    v_reason := coalesce(v_reason || '; ', '') || 'Loser deposited and lost it straight away';
    perform _flag(c.winner_id, 'deposit_and_lose', jsonb_build_object('loser', v_loser, 'deposit', v_recent_deposit, 'stake', c.stake_amount));
  end if;
  v_link := _linked_players(c.winner_id, v_loser);
  if v_link is not null and c.prize_pool >= 3000 then
    v_status := 'frozen';
    v_reason := coalesce(v_reason || '; ', '') || 'Large pot between linked players (' || v_link || ')';
    perform _flag(c.winner_id, 'linked_players_big_pot', jsonb_build_object('loser', v_loser, 'link', v_link, 'pot', c.prize_pool));
  end if;
  update profiles set total_earnings = coalesce(total_earnings, 0) + c.prize_pool where id = c.winner_id;
  perform _credit_held(c.winner_id, c.prize_pool, 'challenge', c.id, v_status, v_reason);
  insert into transactions (user_id, type, amount, description, status, challenge_id, currency)
  values (c.winner_id, 'challenge_win', c.prize_pool, 'Quick match win: ' || c.game || case when v_status = 'frozen' then ' (under review)' else ' (on hold 24h)' end, 'completed', c.id, 'KES');
  update platform_settings set maintenance_balance = coalesce(maintenance_balance, 0) + c.platform_fee where id = (select id from platform_settings limit 1);
end;
$function$;

-- Tournaments: +150 XP for taking part
create or replace function public.handle_tournament_status_change() returns trigger
language plpgsql security definer as $function$
begin
  if new.status = 'completed' and old.status != 'completed' then
    perform distribute_arena_prizes(new.id);
    update tournaments set completed_at = now() where id = new.id and completed_at is null;
    perform set_config('app.bypass_profile_protection', 'true', true);
    update profiles p set tournaments_played = coalesce(p.tournaments_played, 0) + 1, xp = coalesce(p.xp, 0) + 150
    where p.id in (select user_id from tournament_participants where tournament_id = new.id and not coalesce(is_standby, false));
  end if;
  if new.status = 'cancelled' and old.status != 'cancelled' then
    perform refund_tournament_entry_fees(new.id);
  end if;
  if new.status in ('completed', 'cancelled') and old.status is distinct from new.status then
    delete from referee_assignments where tournament_id = new.id;
    update referee_applications set status = 'closed', updated_at = now() where tournament_id = new.id and status = 'pending';
  end if;
  return new;
end;
$function$;

-- Free daily top-up to 100 XP
create or replace function public.claim_daily_xp() returns integer
language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_xp int; v_at timestamptz;
begin
  if v_uid is null then return null; end if;
  select xp, xp_topup_at into v_xp, v_at from profiles where id = v_uid for update;
  if coalesce(v_xp, 0) >= 100 or (v_at is not null and v_at > now() - interval '24 hours') then return null; end if;
  perform set_config('app.bypass_profile_protection', 'true', true);
  update profiles set xp = 100, xp_topup_at = now() where id = v_uid;
  return 100;
end $$;
revoke all on function public.claim_daily_xp() from public, anon;
grant execute on function public.claim_daily_xp() to authenticated;
