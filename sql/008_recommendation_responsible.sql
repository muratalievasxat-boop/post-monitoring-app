-- public schema: integer record_id (matches public.recommendations.id)
CREATE TABLE IF NOT EXISTS recommendation_responsible (
  id        serial  PRIMARY KEY,
  record_id integer NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  org_name  text    NOT NULL,
  role      text    NOT NULL CHECK (role IN ('primary', 'co')),
  UNIQUE (record_id, role, org_name)
);
CREATE INDEX IF NOT EXISTS idx_rec_resp_record_id ON recommendation_responsible(record_id);
CREATE INDEX IF NOT EXISTS idx_rec_resp_role      ON recommendation_responsible(role);

-- monitoring schema: uuid record_id (matches monitoring.recommendations.id)
CREATE TABLE IF NOT EXISTS monitoring.recommendation_responsible (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES monitoring.recommendations(id) ON DELETE CASCADE,
  org_name  text NOT NULL,
  role      text NOT NULL CHECK (role IN ('primary', 'co')),
  UNIQUE (record_id, role, org_name)
);
CREATE INDEX IF NOT EXISTS idx_mrec_resp_record_id ON monitoring.recommendation_responsible(record_id);
CREATE INDEX IF NOT EXISTS idx_mrec_resp_role      ON monitoring.recommendation_responsible(role);
