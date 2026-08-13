-- Legacy monitoring source. The application's canonical public UUID table and
-- its link table are created by 009_public_recommendations_uuid.sql.
CREATE TABLE IF NOT EXISTS monitoring.recommendation_responsible (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES monitoring.recommendations(id) ON DELETE CASCADE,
  org_name  text NOT NULL,
  role      text NOT NULL CHECK (role IN ('primary', 'co')),
  position  integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (record_id, org_name)
);
ALTER TABLE monitoring.recommendation_responsible
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
ALTER TABLE monitoring.recommendation_responsible
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_mrec_resp_record_id ON monitoring.recommendation_responsible(record_id);
CREATE INDEX IF NOT EXISTS idx_mrec_resp_role      ON monitoring.recommendation_responsible(role);
