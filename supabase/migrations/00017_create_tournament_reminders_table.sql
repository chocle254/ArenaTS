
-- Create tournament reminders table
CREATE TABLE IF NOT EXISTS tournament_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  reminder_24h boolean DEFAULT false,
  reminder_1h boolean DEFAULT false,
  reminder_15m boolean DEFAULT false,
  sent_24h boolean DEFAULT false,
  sent_1h boolean DEFAULT false,
  sent_15m boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tournament_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tournament_reminders_user_id ON tournament_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_reminders_tournament_id ON tournament_reminders(tournament_id);

-- RLS Policies
ALTER TABLE tournament_reminders ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view own reminders"
  ON tournament_reminders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own reminders
CREATE POLICY "Users can insert own reminders"
  ON tournament_reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reminders
CREATE POLICY "Users can update own reminders"
  ON tournament_reminders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own reminders
CREATE POLICY "Users can delete own reminders"
  ON tournament_reminders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to check and get due reminders
CREATE OR REPLACE FUNCTION get_due_reminders(p_user_id uuid)
RETURNS TABLE (
  reminder_id uuid,
  tournament_id uuid,
  tournament_name text,
  start_time timestamptz,
  reminder_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id as reminder_id,
    t.id as tournament_id,
    t.name as tournament_name,
    t.start_time,
    CASE
      WHEN tr.reminder_24h AND NOT tr.sent_24h AND t.start_time <= NOW() + INTERVAL '24 hours' AND t.start_time > NOW() THEN '24h'
      WHEN tr.reminder_1h AND NOT tr.sent_1h AND t.start_time <= NOW() + INTERVAL '1 hour' AND t.start_time > NOW() THEN '1h'
      WHEN tr.reminder_15m AND NOT tr.sent_15m AND t.start_time <= NOW() + INTERVAL '15 minutes' AND t.start_time > NOW() THEN '15m'
      ELSE NULL
    END as reminder_type
  FROM tournament_reminders tr
  JOIN tournaments t ON tr.tournament_id = t.id
  WHERE tr.user_id = p_user_id
  AND t.status IN ('open', 'live', 'active')
  AND (
    (tr.reminder_24h AND NOT tr.sent_24h AND t.start_time <= NOW() + INTERVAL '24 hours' AND t.start_time > NOW())
    OR (tr.reminder_1h AND NOT tr.sent_1h AND t.start_time <= NOW() + INTERVAL '1 hour' AND t.start_time > NOW())
    OR (tr.reminder_15m AND NOT tr.sent_15m AND t.start_time <= NOW() + INTERVAL '15 minutes' AND t.start_time > NOW())
  );
END;
$$;

-- Function to mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(p_reminder_id uuid, p_reminder_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_reminder_type = '24h' THEN
    UPDATE tournament_reminders SET sent_24h = true WHERE id = p_reminder_id;
  ELSIF p_reminder_type = '1h' THEN
    UPDATE tournament_reminders SET sent_1h = true WHERE id = p_reminder_id;
  ELSIF p_reminder_type = '15m' THEN
    UPDATE tournament_reminders SET sent_15m = true WHERE id = p_reminder_id;
  END IF;
END;
$$;
