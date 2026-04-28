-- Drop old tables (any schema variant) and recreate public.recommendations with snake_case columns.
-- Safe to re-run: all CREATE statements are IF NOT EXISTS; DROP is intentional (clean import).

DROP TABLE IF EXISTS public.recommendation_responsible CASCADE;
DROP TABLE IF EXISTS public.status_history CASCADE;
DROP TABLE IF EXISTS public.recommendations CASCADE;

CREATE TABLE public.recommendations (
  id                     serial       PRIMARY KEY,
  seq_no                 integer,
  record_type_raw        text,
  record_type_normalized text,
  cycle                  text,
  sphere_raw             text,
  sphere_normalized      text,
  proposal_text          text         NOT NULL,
  responsible_org        text,
  interested_orgs        text,
  completion_form        text,
  due_raw                text,
  status_raw             text,
  status_normalized      text,
  status_group           text,
  position_2024_2025     text,
  position_2026          text,
  adgs_position          text,
  case_note              text,
  status_updated_at      timestamptz,
  source_row_no          integer,
  source_file_name       text,
  source_sheet_name      text,
  quality_flag           text,
  created_at             timestamptz  NOT NULL DEFAULT now(),
  updated_at             timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX ON recommendations(cycle);
CREATE INDEX ON recommendations(status_normalized);
CREATE INDEX ON recommendations(status_group);
CREATE INDEX ON recommendations(sphere_normalized);
CREATE INDEX ON recommendations(responsible_org);

CREATE TABLE public.status_history (
  id         serial      PRIMARY KEY,
  record_id  integer     NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  comment    text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON status_history(record_id);

CREATE TABLE public.recommendation_responsible (
  id        serial  PRIMARY KEY,
  record_id integer NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  org_name  text    NOT NULL,
  role      text    NOT NULL CHECK (role IN ('primary', 'co')),
  UNIQUE (record_id, role, org_name)
);

CREATE INDEX ON recommendation_responsible(record_id);
CREATE INDEX ON recommendation_responsible(role);
