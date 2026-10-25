-- Run once in Supabase SQL Editor. Participant data remains server-only.
create table if not exists public.spark_registration_revisions (
 activity_id text primary key, version bigint not null default 0
);
create table if not exists public.spark_registrations (
 id text primary key,
 activity_id text not null,
 owner_hash text not null check (owner_hash ~ '^[a-f0-9]{64}$'),
 record jsonb not null check (pg_column_size(record) < 2000000),
 updated_at timestamptz not null default now()
);
create index if not exists spark_registrations_owner on public.spark_registrations(owner_hash);
create index if not exists spark_registrations_activity on public.spark_registrations(activity_id);
alter table public.spark_registrations enable row level security;
alter table public.spark_registration_revisions enable row level security;
revoke all on public.spark_registrations, public.spark_registration_revisions from anon, authenticated;
grant select, insert, update on public.spark_registrations, public.spark_registration_revisions to service_role;

create or replace function public.spark_registration_summary(r jsonb) returns jsonb
language sql immutable set search_path=public,pg_catalog as $$
 select jsonb_set(r - 'receipt', '{details}', (r->'details') - 'idDocument') ||
 jsonb_build_object('hasReceipt', coalesce(r->'receipt'->>'uri','') <> '', 'hasIdDocument', coalesce(r->'details'->'idDocument'->>'uri','') <> '');
$$;
create or replace function public.spark_registration_snapshot(p_activity text) returns jsonb
language sql stable set search_path=public,pg_catalog as $$
 select jsonb_build_object('version',coalesce((select version from spark_registration_revisions where activity_id=p_activity),0),
 'records',coalesce((select jsonb_agg(spark_registration_summary(record)) from spark_registrations where activity_id=p_activity),'[]'::jsonb));
$$;
create or replace function public.spark_registration_list(p_owner_hash text default null) returns jsonb
language sql stable set search_path=public,pg_catalog as $$
 select coalesce(jsonb_agg(spark_registration_summary(record) order by updated_at desc),'[]'::jsonb)
 from spark_registrations where p_owner_hash is null or owner_hash=p_owner_hash;
$$;
create or replace function public.spark_registration_occupancy() returns jsonb
language sql stable set search_path=public,pg_catalog as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'activityId',activity_id,'status',record->>'status',
 'details',jsonb_build_object('tentNumber',record->'details'->'tentNumber'))),'[]'::jsonb)
 from spark_registrations where record->>'status' in ('Pending','Confirmed');
$$;
create or replace function public.spark_registration_commit(p_activity text,p_version bigint,p_owner_hash text,p_record jsonb) returns boolean
language plpgsql set search_path=public,pg_catalog as $$
declare current_version bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_activity,0));
 insert into spark_registration_revisions(activity_id) values(p_activity) on conflict do nothing;
 select version into current_version from spark_registration_revisions where activity_id=p_activity for update;
 if current_version <> p_version then return false; end if;
 if p_record->>'activityId' is distinct from p_activity or p_record->>'id' is null then raise exception 'Invalid registration'; end if;
 if exists(select 1 from spark_registrations where id=p_record->>'id' and (owner_hash<>p_owner_hash or activity_id<>p_activity)) then raise exception 'Registration ownership mismatch'; end if;
 insert into spark_registrations(id,activity_id,owner_hash,record) values(p_record->>'id',p_activity,p_owner_hash,p_record)
 on conflict(id) do update set record=excluded.record,updated_at=now();
 update spark_registration_revisions set version=version+1 where activity_id=p_activity;
 return true;
end;
$$;
revoke all on function public.spark_registration_summary(jsonb), public.spark_registration_snapshot(text), public.spark_registration_list(text), public.spark_registration_occupancy(), public.spark_registration_commit(text,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.spark_registration_summary(jsonb), public.spark_registration_snapshot(text), public.spark_registration_list(text), public.spark_registration_occupancy(), public.spark_registration_commit(text,bigint,text,jsonb) to service_role;
