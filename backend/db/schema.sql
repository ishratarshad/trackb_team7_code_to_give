-- Full schema for Food Access Insights Platform

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$
begin
    if not exists (select 1 from pg_type where typname = 'resource_type') then
        create type resource_type as enum (
            'produce',
            'protein',
            'dairy',
            'grains',
            'canned',
            'packaged',
            'beverages',
            'condiments',
            'snacks',
            'other'
        );
    end if;
end $$;

-- Core entities
create table if not exists pantries (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    neighborhood text not null,
    address text,
    latitude double precision,
    longitude double precision,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists pantries_name_idx on pantries (name);
create index if not exists pantries_neighborhood_idx on pantries (neighborhood);

create table if not exists issue_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    keywords jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists feedback (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    pantry_id uuid not null references pantries(id) on delete cascade,
    rating int not null check (rating between 1 and 5),
    wait_time_min int,
    resource_type resource_type not null,
    items_unavailable text,
    comment text,
    issue_categories jsonb,
    raw_payload jsonb
);

create index if not exists feedback_created_at_idx on feedback (created_at desc);
create index if not exists feedback_pantry_id_idx on feedback (pantry_id);
create index if not exists feedback_resource_type_idx on feedback (resource_type);

create table if not exists feedback_issue_categories (
    feedback_id uuid not null references feedback(id) on delete cascade,
    issue_category_id uuid not null references issue_categories(id) on delete cascade,
    primary key (feedback_id, issue_category_id)
);

create table if not exists supply_profiles (
    pantry_id uuid primary key references pantries(id) on delete cascade,
    normalized_foods jsonb not null default '[]'::jsonb,
    category_distribution jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

-- Public datasets
create table if not exists public_datasets (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    source text not null,
    ingested_at timestamptz not null default now(),
    description text
);

create table if not exists public_dataset_metrics (
    id uuid primary key default gen_random_uuid(),
    dataset_id uuid not null references public_datasets(id) on delete cascade,
    geo_unit_id text not null,
    metrics jsonb not null,
    recorded_at timestamptz not null default now()
);

create index if not exists public_dataset_metrics_dataset_idx on public_dataset_metrics (dataset_id);
create index if not exists public_dataset_metrics_geo_unit_idx on public_dataset_metrics (geo_unit_id);

-- Reports
create table if not exists reports (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    filters jsonb not null default '{}'::jsonb,
    generated_at timestamptz not null default now(),
    export_url text
);
