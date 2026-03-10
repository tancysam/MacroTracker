-- Allow anonymous (public) read access to articles
CREATE POLICY "Public can read articles"
  ON articles
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous read access to heat_scores
CREATE POLICY "Public can read heat_scores"
  ON heat_scores
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous read access to entity_mentions
CREATE POLICY "Public can read entity_mentions"
  ON entity_mentions
  FOR SELECT
  TO anon
  USING (true);
