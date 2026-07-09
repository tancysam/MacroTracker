ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE heat_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_mentions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE articles FROM anon, authenticated;
REVOKE ALL ON TABLE heat_scores FROM anon, authenticated;
REVOKE ALL ON TABLE entity_mentions FROM anon, authenticated;
