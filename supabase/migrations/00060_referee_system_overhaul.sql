-- 1. Add 'referee' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'referee';

-- 2. Create referee_applications table
CREATE TABLE IF NOT EXISTS referee_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create referee_application_messages table for admin-applicant chat
CREATE TABLE IF NOT EXISTS referee_application_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES referee_applications(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Create referee_assignments table
CREATE TABLE IF NOT EXISTS referee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game game_type NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, game)
);

-- 5. Update disputes table if needed (it already has resolved_by)
-- Let's add a helper function for referee check
CREATE OR REPLACE FUNCTION is_referee(uid uuid, p_game game_type)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM referee_assignments
    WHERE user_id = uid AND game = p_game
  ) OR EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = uid AND role = 'admin'
  );
$$;

-- 6. RLS for referee_applications
ALTER TABLE referee_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications" ON referee_applications
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications" ON referee_applications
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view and update all applications" ON referee_applications
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 7. RLS for referee_application_messages
ALTER TABLE referee_application_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and send messages for their applications" ON referee_application_messages
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM referee_applications 
    WHERE id = application_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- 8. RLS for referee_assignments
ALTER TABLE referee_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view assignments" ON referee_assignments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage assignments" ON referee_assignments
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 9. Update match_results policies to allow referees
CREATE POLICY "Referees can update match results for their assigned games" ON match_results
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_id AND is_referee(auth.uid(), t.game)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_id AND is_referee(auth.uid(), t.game)
  )
);

-- 10. Update disputes policies to allow referees
CREATE POLICY "Referees can view and update disputes for their assigned games" ON disputes
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_id AND is_referee(auth.uid(), t.game)
  )
);

-- 11. Update dispute_messages policies to allow referees
CREATE POLICY "Referees can view and send messages in disputes for their assigned games" ON dispute_messages
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM disputes d
    JOIN tournaments t ON t.id = d.tournament_id
    WHERE d.id = dispute_id AND is_referee(auth.uid(), t.game)
  )
);
