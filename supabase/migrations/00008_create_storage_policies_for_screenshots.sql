-- Storage policies for tournament screenshots
DROP POLICY IF EXISTS "Anyone can view tournament screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload screenshots" ON storage.objects;

CREATE POLICY "Anyone can view tournament screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'tournament_screenshots');

CREATE POLICY "Authenticated users can upload screenshots" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tournament_screenshots');