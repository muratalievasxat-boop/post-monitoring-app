create extension if not exists "pgcrypto";
create schema if not exists monitoring;

create table monitoring.dict_status (
    id uuid primary key default gen_random_uuid(),
    raw_value text not null,
    normalized_value text not null,
    status_group text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (raw_value)
);

create table monitoring.dict_sphere (
    id uuid primary key default gen_random_uuid(),
    raw_value text not null,
    normalized_value text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (raw_value)
);

create table monitoring.import_batches (
    id uuid primary key default gen_random_uuid(),
    file_name text not null,
    uploaded_by text,
    source_sheet text,
    uploaded_at timestamptz not null default now(),
    status text not null default 'uploaded',
    rows_total int not null default 0,
    rows_inserted int not null default 0,
    rows_updated int not null default 0,
    rows_conflicted int not null default 0,
    rows_errors int not null default 0,
    notes text
);

create table monitoring.recommendations (
    id uuid primary key default gen_random_uuid(),
    record_hash text not null,
    seq_no int,
    record_type_raw text,
    record_type_normalized text,
    cycle text,
    sphere_raw text,
    sphere_normalized text,
    proposal_text text not null,
    responsible_org text,
    interested_orgs text,
    completion_form text,
    due_raw text,
    due_type text,
    due_sort_key date,
    status_raw text,
    status_normalized text,
    status_group text,
    position_2024_2025 text,
    position_current text,
    adgs_position text,
    case_text text,
    source_row_no int,
    source_file_name text,
    source_sheet_name text,
    first_import_batch_id uuid references monitoring.import_batches(id),
    last_import_batch_id uuid references monitoring.import_batches(id),
    status_updated_at timestamptz,
    quality_flag text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (record_hash)
);

create index idx_recommendations_cycle on monitoring.recommendations(cycle);
create index idx_recommendations_sphere_normalized on monitoring.recommendations(sphere_normalized);
create index idx_recommendations_status_normalized on monitoring.recommendations(status_normalized);
create index idx_recommendations_status_group on monitoring.recommendations(status_group);
create index idx_recommendations_responsible_org on monitoring.recommendations(responsible_org);
create index idx_recommendations_due_sort_key on monitoring.recommendations(due_sort_key);

create table monitoring.import_rows (
    id uuid primary key default gen_random_uuid(),
    batch_id uuid not null references monitoring.import_batches(id) on delete cascade,
    source_row_no int,
    record_hash text,
    action text not null,
    warning_text text,
    error_text text,
    raw_payload jsonb,
    normalized_payload jsonb,
    created_at timestamptz not null default now()
);

create index idx_import_rows_batch_id on monitoring.import_rows(batch_id);

create table monitoring.recommendation_history (
    id uuid primary key default gen_random_uuid(),
    recommendation_id uuid not null references monitoring.recommendations(id) on delete cascade,
    batch_id uuid references monitoring.import_batches(id),
    change_type text not null,
    old_data jsonb,
    new_data jsonb,
    changed_by text,
    changed_at timestamptz not null default now()
);

create index idx_recommendation_history_recommendation_id
    on monitoring.recommendation_history(recommendation_id);

create or replace function monitoring.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_recommendations_updated_at
before update on monitoring.recommendations
for each row
execute function monitoring.set_updated_at();
