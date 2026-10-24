-- Run in the SQL editor of the Supabase project used by Spark Youth.
-- Dedicated content snapshot: never grant public readers the full admin JSON.
create table if not exists public.spark_content (
  id text primary key check (id = 'main'),
  content jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.spark_content enable row level security;
revoke all on public.spark_content from anon, authenticated;
grant select, insert, update on public.spark_content to service_role;

-- Only the server's service-role client accesses this private bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'spark-content-media', 'spark-content-media', false, 4000000,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- No anonymous/authenticated storage policies are created.
-- /api/content exposes a filtered public snapshot; /api/media/:id serves only
-- public-facing content images. ID documents and medical data do not belong here.
