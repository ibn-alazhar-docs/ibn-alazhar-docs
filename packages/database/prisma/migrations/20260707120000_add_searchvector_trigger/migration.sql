-- Add missing BEFORE INSERT/UPDATE trigger to maintain searchvector automatically.
-- The db_hardening migration (20260616120000) defined update_searchvector()
-- but never attached a trigger, so searchvector was only refreshed by app-side
-- calls. This ensures every insert/update populates searchvector correctly.

DROP TRIGGER IF EXISTS trg_update_searchvector ON documents;

CREATE TRIGGER trg_update_searchvector
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_searchvector();
