-- Tournament completion fixes (found in the 2026-11-07 end-to-end test)
-- 1) No winner (both finalists no-showed): refund entries and the host's guaranteed
--    prize instead of losing it and still taking the 10% fee.
-- 2) Finishing places are recorded for every tournament, free ones too.
-- 3) On completion: stamp completed_at and count the tournament in tournaments_played
--    (it was never incremented, so the "Tournament debut" achievement could not unlock).

create or replace function public.distribute_arena_prizes(p_tournament_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $function$
declare
  t tournaments%rowtype;
  v_fee numeric; v_gross numeric; v_net numeric; v_entries numeric; v_bonus numeric; v_creator_entries numeric;
  v_final match_results%rowtype;
  v_first uuid; v_second uuid; v_thirds uuid[];
  v_s1 numeric; v_s2 numeric; v_s3 numeric;
  v_paid numeric := 0; v_rounds int; u uuid;
begin
  select * into t from tournaments where id = p_tournament_id for update;
  if not found or coalesce(t.prizes_distributed, false) then return; end if;

  v_rounds := coalesce(t.num_rounds, (select max(round) from match_results where tournament_id = t.id));
  select * into v_final from match_results where tournament_id = t.id and round = v_rounds and status = 'confirmed' order by updated_at desc limit 1;
  v_first := coalesce(v_final.winner_id, t.winner_id);
  v_second := case when v_final.winner_id = v_final.player1_id then v_final.player2_id when v_final.winner_id = v_final.player2_id then v_final.player1_id end;
  select array_agg(case when winner_id = player1_id then player2_id else player1_id end) into v_thirds
  from match_results where tournament_id = t.id and round = v_rounds - 1 and status = 'confirmed' and winner_id is not null
    and (case when winner_id = player1_id then player2_id else player1_id end) is not null;

  -- Nobody won: give everyone their money back, take no fee
  if v_first is null then
    perform refund_tournament_entry_fees(p_tournament_id);
    update tournaments set prizes_distributed = true where id = p_tournament_id;
    return;
  end if;

  -- Places, prize or not
  update tournament_participants set final_position = 1 where tournament_id = t.id and user_id = v_first;
  if v_second is not null then
    update tournament_participants set final_position = 2, eliminated = true where tournament_id = t.id and user_id = v_second;
  end if;
  if coalesce(cardinality(v_thirds), 0) > 0 then
    update tournament_participants set final_position = 3, eliminated = true where tournament_id = t.id and user_id = any(v_thirds);
  end if;

  -- Only real cash counts: welcome-ticket credit never pays the creator
  select coalesce(sum(amount_paid - coalesce(credit_used, 0)), 0) into v_entries from tournament_participants where tournament_id = p_tournament_id;
  v_bonus := coalesce(tournament_pool_bonus(p_tournament_id), 0);
  v_gross := coalesce(t.prize_pool, 0) + v_bonus;
  v_fee := round(v_gross * coalesce(t.platform_fee_percentage, 10) / 100.0, 2);
  v_net := v_gross - v_fee;

  v_s1 := coalesce((t.prize_distribution ->> '1st')::numeric, 1);
  v_s2 := coalesce((t.prize_distribution ->> '2nd')::numeric, 0);
  v_s3 := coalesce((t.prize_distribution ->> '3rd')::numeric, 0);
  if v_second is null then v_s1 := v_s1 + v_s2; v_s2 := 0; end if;
  if coalesce(cardinality(v_thirds), 0) = 0 then v_s1 := v_s1 + v_s3; v_s3 := 0; end if;

  if v_net > 0 then
    perform _pay_tournament_place(t, v_second, round(v_net * v_s2, 2), '2nd');
    v_paid := v_paid + round(v_net * v_s2, 2);
    if v_s3 > 0 then
      foreach u in array v_thirds loop
        perform _pay_tournament_place(t, u, round(v_net * v_s3 / cardinality(v_thirds), 2), '3rd');
        v_paid := v_paid + round(v_net * v_s3 / cardinality(v_thirds), 2);
      end loop;
    end if;
    perform _pay_tournament_place(t, v_first, v_net - v_paid, '1st');
  end if;

  -- Entries that didn't grow the pool go to the creator, minus 10%, on hold
  v_creator_entries := v_entries - v_bonus;
  if v_creator_entries > 0 and t.created_by is not null then
    v_fee := v_fee + round(v_creator_entries * 0.10, 2);
    perform _credit_held(t.created_by, v_creator_entries - round(v_creator_entries * 0.10, 2), 'entry_fees', t.id);
    insert into transactions (user_id, type, amount, description, status, tournament_id, currency)
    values (t.created_by, 'payout', v_creator_entries - round(v_creator_entries * 0.10, 2), 'Entry fees for ' || t.name || ' (on hold 24h)', 'completed', t.id, 'KES');
  end if;

  if v_fee > 0 then
    update platform_settings set maintenance_balance = coalesce(maintenance_balance, 0) + v_fee where id = (select id from platform_settings limit 1);
  end if;
  update tournaments set prizes_distributed = true where id = p_tournament_id;
end;
$function$;

create or replace function public.handle_tournament_status_change() returns trigger
language plpgsql security definer as $function$
begin
  if new.status = 'completed' and old.status != 'completed' then
    perform distribute_arena_prizes(new.id);
    update tournaments set completed_at = now() where id = new.id and completed_at is null;
    perform set_config('app.bypass_profile_protection', 'true', true);
    update profiles p set tournaments_played = coalesce(p.tournaments_played, 0) + 1
    where p.id in (select user_id from tournament_participants where tournament_id = new.id and not coalesce(is_standby, false));
  end if;
  if new.status = 'cancelled' and old.status != 'cancelled' then
    perform refund_tournament_entry_fees(new.id);
  end if;
  return new;
end;
$function$;

-- Backfill tournaments already completed
select set_config('app.bypass_profile_protection', 'true', true);
update profiles p set tournaments_played = x.n
from (
  select tp.user_id, count(distinct tp.tournament_id) n
  from tournament_participants tp join tournaments t on t.id = tp.tournament_id
  where t.status = 'completed' and not coalesce(tp.is_standby, false)
  group by tp.user_id
) x
where x.user_id = p.id and coalesce(p.tournaments_played, 0) < x.n;
update tournaments set completed_at = coalesce(updated_at, now()) where status = 'completed' and completed_at is null;
