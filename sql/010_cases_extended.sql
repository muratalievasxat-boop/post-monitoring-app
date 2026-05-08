-- Categories
CREATE TABLE IF NOT EXISTS public.case_categories (
  id serial primary key,
  name text not null unique,
  sort_order int not null default 0
);

INSERT INTO public.case_categories (name, sort_order) VALUES
  ('Оптимизация функций', 1),
  ('Привлечение внештатных работников', 2),
  ('Взаимодействие с субъектами квазигосударственного сектора', 3),
  ('Формирование и ведение отчетности', 4),
  ('Оказание государственных услуг', 5),
  ('Осуществление государственных закупок', 6),
  ('Автоматизация административных процедур', 7),
  ('Выявление и устранение правовых коллизий', 8)
ON CONFLICT (name) DO NOTHING;

-- Cycles
CREATE TABLE IF NOT EXISTS public.case_cycles (
  id serial primary key,
  name text not null unique,
  is_open boolean not null default false,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

INSERT INTO public.case_cycles (name, is_open, start_date, end_date) VALUES
  ('Цикл VIII', false, '2025-01-01', '2025-12-31'),
  ('Цикл IX', true, '2026-01-01', '2026-12-31')
ON CONFLICT (name) DO NOTHING;

-- Extend cases table
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS category_id int references public.case_categories(id),
  ADD COLUMN IF NOT EXISTS cycle_id int references public.case_cycles(id),
  ADD COLUMN IF NOT EXISTS due_date date;

-- Attachments stored as bytea
CREATE TABLE IF NOT EXISTS public.case_attachments (
  id serial primary key,
  case_id int not null references public.cases(id) on delete cascade,
  filename text not null,
  mimetype text not null,
  size_bytes int not null,
  data bytea not null,
  uploaded_by int references public.users(id),
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_case_attachments_case_id
  ON public.case_attachments(case_id);
