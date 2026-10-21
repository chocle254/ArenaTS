-- The match-chat message on clashing reports still described the old
-- "cancel for a 0.5 rating penalty" flow. Point players to evidence instead.
DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.handle_challenge_result_v2()'::regprocedure);
  d := replace(d,
    $q$'⚠️ Both of you are claiming to be winners. Discuss again on the real winner. If you don''t come to an agreement, you can cancel the match but it will reduce your rating scores by 0.5. You can change your report until the timer ends.'$q$,
    $q$'⚠️ You both reported a win. If you agree on the real winner, change your report. Otherwise upload a screenshot or short recording of the final score; the AI referee reviews it, and a human referee steps in if it''s unclear.'$q$);
  IF position('AI referee reviews it' in d) = 0 THEN
    RAISE EXCEPTION 'message text not found';
  END IF;
  EXECUTE d;
END $do$;
