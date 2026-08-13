BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- The previous public model used integer identifiers. It cannot be altered in
-- place while dependent foreign keys exist, and this task is an intentional
-- clean rebuild. Only incompatible public tables are removed; re-running this
-- migration after the UUID transition preserves imported data.
DO $$
DECLARE
  id_type text;
BEGIN
  SELECT data_type
  INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'recommendations'
    AND column_name = 'id';

  IF id_type IS NOT NULL AND id_type <> 'uuid' THEN
    DROP TABLE IF EXISTS public.recommendation_responsible CASCADE;
    DROP TABLE IF EXISTS public.status_history CASCADE;
    DROP TABLE public.recommendations CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.recommendations (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_no                 integer     NOT NULL,
  record_type_raw        text,
  record_type_normalized text        NOT NULL,
  cycle                  text,
  sphere_raw             text,
  sphere_normalized      text,
  proposal_text          text        NOT NULL,
  responsible_org        text,
  interested_orgs        text,
  completion_form        text,
  due_raw                text,
  due_sort_key           date,
  due_parse_failed       boolean     NOT NULL DEFAULT false,
  status_raw             text,
  status_normalized      text        NOT NULL,
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
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendations_record_type_check
    CHECK (record_type_normalized IN ('Мониторинг', 'Анализ'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_recommendations_seq_no
  ON public.recommendations(seq_no);
CREATE INDEX IF NOT EXISTS idx_recommendations_cycle
  ON public.recommendations(cycle);
CREATE INDEX IF NOT EXISTS idx_recommendations_status_normalized
  ON public.recommendations(status_normalized);
CREATE INDEX IF NOT EXISTS idx_recommendations_sphere_normalized
  ON public.recommendations(sphere_normalized);
CREATE INDEX IF NOT EXISTS idx_recommendations_responsible_org
  ON public.recommendations(responsible_org);
CREATE INDEX IF NOT EXISTS idx_recommendations_due_sort_key
  ON public.recommendations(due_sort_key);

DO $$
DECLARE
  record_id_type text;
BEGIN
  SELECT data_type
  INTO record_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'status_history'
    AND column_name = 'record_id';

  IF record_id_type IS NOT NULL AND record_id_type <> 'uuid' THEN
    DROP TABLE public.status_history CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.status_history (
  id         bigserial   PRIMARY KEY,
  record_id  uuid        NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  comment    text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_record_id
  ON public.status_history(record_id);

DO $$
DECLARE
  record_id_type text;
  has_position boolean;
  has_created_at boolean;
BEGIN
  SELECT data_type
  INTO record_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'recommendation_responsible'
    AND column_name = 'record_id';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recommendation_responsible'
      AND column_name = 'position'
  ) INTO has_position;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recommendation_responsible'
      AND column_name = 'created_at'
  ) INTO has_created_at;

  IF record_id_type IS NOT NULL
     AND (record_id_type <> 'uuid' OR NOT has_position OR NOT has_created_at) THEN
    DROP TABLE public.recommendation_responsible CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.recommendation_responsible (
  id         bigserial   PRIMARY KEY,
  record_id  uuid        NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  org_name   text        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('primary', 'co')),
  position   integer     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rec_resp_record_org
  ON public.recommendation_responsible(record_id, org_name);
CREATE INDEX IF NOT EXISTS idx_rec_resp_record_id
  ON public.recommendation_responsible(record_id);
CREATE INDEX IF NOT EXISTS idx_rec_resp_role
  ON public.recommendation_responsible(role);

CREATE OR REPLACE FUNCTION public.set_recommendations_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recommendations_updated_at ON public.recommendations;
CREATE TRIGGER trg_recommendations_updated_at
BEFORE UPDATE ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION public.set_recommendations_updated_at();

COMMIT;
