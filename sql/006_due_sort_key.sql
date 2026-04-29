-- Adds structured due-date columns so overdue logic can use < current_date
-- instead of LIKE '%2024%'. Safe to re-run (IF NOT EXISTS / IF NOT EXISTS guard).

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS due_sort_key   date,
  ADD COLUMN IF NOT EXISTS due_parse_failed boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_recs_due_sort_key
  ON recommendations(due_sort_key)
  WHERE due_sort_key IS NOT NULL;

-- Same columns in the monitoring staging table (used by import-worker)
ALTER TABLE monitoring.recommendations
  ADD COLUMN IF NOT EXISTS due_sort_key   date,
  ADD COLUMN IF NOT EXISTS due_parse_failed boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_monitoring_recs_due_sort_key
  ON monitoring.recommendations(due_sort_key)
  WHERE due_sort_key IS NOT NULL;
