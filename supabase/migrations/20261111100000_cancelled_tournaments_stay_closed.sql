-- A cancelled tournament has already refunded everyone, so nothing may later
-- "complete" it and pay prizes on top. A late dispute decision used to do that
-- via advance_winner. Cancelling now also closes the tournament's open disputes
-- (they kept showing as live matches in Streams).

SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.advance_winner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_match_number      integer;
  v_next_round        integer;
  v_next_match_number integer;
  v_next_match_id     text;
  v_num_rounds        integer;
  v_tournament_mode   text;
  v_status            text;
  v_winner_team_id    uuid;
  v_next_match        match_results%ROWTYPE;
  v_other_player_id   uuid;
BEGIN
  IF NEW.status != 'confirmed' OR OLD.status = 'confirmed' OR NEW.winner_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_match_number      := SUBSTRING(NEW.match_id FROM 'm(\d+)$')::integer;
  v_next_round        := NEW.round + 1;
  v_next_match_number := v_match_number / 2;
  v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;

  SELECT num_rounds, mode, status::text INTO v_num_rounds, v_tournament_mode, v_status
  FROM tournaments WHERE id = NEW.tournament_id;

  -- Cancelled or finished tournaments don't move any more
  IF v_status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  IF v_next_round > v_num_rounds THEN
    UPDATE tournaments
    SET status = 'completed', winner_id = NEW.winner_id, completed_at = now()
    WHERE id = NEW.tournament_id AND status = 'active';
    RETURN NEW;
  END IF;

  IF v_tournament_mode = 'team' THEN
    SELECT team_id INTO v_winner_team_id
    FROM tournament_participants
    WHERE tournament_id = NEW.tournament_id AND user_id = NEW.winner_id
    LIMIT 1;
  END IF;

  SELECT * INTO v_next_match
  FROM match_results
  WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;

  IF NOT FOUND THEN
    RAISE WARNING 'advance_winner: target match % not found for tournament %', v_next_match_id, NEW.tournament_id;
    RETURN NEW;
  END IF;

  IF v_match_number % 2 = 0 THEN
    v_other_player_id := v_next_match.player2_id;
    UPDATE match_results
    SET player1_id = NEW.winner_id, team1_id = v_winner_team_id, player1_checked_in = false, both_players_ready = false,
        check_in_deadline = CASE WHEN v_other_player_id IS NOT NULL THEN now() + interval '5 minutes' ELSE check_in_deadline END
    WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;
  ELSE
    v_other_player_id := v_next_match.player1_id;
    UPDATE match_results
    SET player2_id = NEW.winner_id, team2_id = v_winner_team_id, player2_checked_in = false, both_players_ready = false,
        check_in_deadline = CASE WHEN v_other_player_id IS NOT NULL THEN now() + interval '5 minutes' ELSE check_in_deadline END
    WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_tournament_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Only a running tournament can finish; a cancelled one was already refunded
  if new.status = 'completed' and old.status = 'active' then
    perform distribute_arena_prizes(new.id);
    update tournaments set completed_at = now() where id = new.id and completed_at is null;
    perform set_config('app.bypass_profile_protection', 'true', true);
    update profiles p set tournaments_played = coalesce(p.tournaments_played, 0) + 1, xp = coalesce(p.xp, 0) + 150
    where p.id in (select user_id from tournament_participants where tournament_id = new.id and not coalesce(is_standby, false));
  end if;
  if new.status = 'cancelled' and old.status != 'cancelled' then
    perform refund_tournament_entry_fees(new.id);
    update match_disputes set status = 'void', decided_at = coalesce(decided_at, now())
    where tournament_id = new.id and status not in ('decided', 'void');
  end if;
  if new.status in ('completed', 'cancelled') and old.status is distinct from new.status then
    delete from referee_assignments where tournament_id = new.id;
    update referee_applications set status = 'closed', updated_at = now() where tournament_id = new.id and status = 'pending';
  end if;
  return new;
end;
$function$;

-- Close disputes left open on tournaments that already ended
UPDATE match_disputes d SET status = 'void', decided_at = coalesce(d.decided_at, now())
FROM tournaments t
WHERE t.id = d.tournament_id AND t.status IN ('cancelled', 'completed') AND d.status NOT IN ('decided', 'void');
