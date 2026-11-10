-- Kalamata FC · Match Programme — initial schema
-- Run in Supabase: SQL Editor → paste → Run (or `supabase db push`).
-- All timestamps are stored in UTC and shown in Europe/Athens.

create extension if not exists "pgcrypto";

-- ---------- staff accounts ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- issues ----------
create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  number int not null,
  season text not null default '2026/27',
  opponent text not null default '',
  opponent_crest_url text not null default '',
  is_home boolean not null default true,
  matchday int not null default 1,
  competition text not null default 'Stoiximan Super League',
  stadium text not null default '',
  kickoff_at timestamptz not null,
  publish_at timestamptz not null,
  expires_at timestamptz not null,
  archive_access text not null default 'gated' check (archive_access in ('gated','open','hidden')),
  status text not null default 'draft' check (status in ('draft','published')),
  countdown_sponsor_url text not null default '',
  cover_photo_url text not null default '',
  cover_cutout_url text not null default '',
  cover_tone text not null default 'ink' check (cover_tone in ('ink','white','photo')),
  cover_lines jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  page_manifest jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists issues_publish_idx on public.issues (status, publish_at);
create index if not exists issues_number_idx on public.issues (number);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists issues_touch on public.issues;
create trigger issues_touch before update on public.issues for each row execute function public.touch_updated_at();

-- ---------- sign-ups ----------
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  email text not null,
  marketing_consent boolean not null default false,
  consented_at timestamptz,
  privacy_ack_at timestamptz not null default now(),
  user_agent text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (issue_id, email)
);
create index if not exists subscribers_issue_idx on public.subscribers (issue_id, created_at desc);

-- ---------- analytics ----------
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  issue_id uuid not null references public.issues(id) on delete cascade,
  page_index int not null,
  session_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists page_views_issue_idx on public.page_views (issue_id, created_at);

-- ---------- row level security ----------
alter table public.admins enable row level security;
alter table public.issues enable row level security;
alter table public.subscribers enable row level security;
alter table public.page_views enable row level security;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select using (user_id = auth.uid());

-- Public visitors read published issues: live/scheduled ones, and archived ones unless hidden.
drop policy if exists "public reads published issues" on public.issues;
create policy "public reads published issues" on public.issues for select
  using (status = 'published' and (expires_at > now() or archive_access <> 'hidden'));

drop policy if exists "admins manage issues" on public.issues;
create policy "admins manage issues" on public.issues for all using (public.is_admin()) with check (public.is_admin());

-- Sign-ups and page views are written only by the API routes (service role). Staff can read/delete.
drop policy if exists "admins read subscribers" on public.subscribers;
create policy "admins read subscribers" on public.subscribers for select using (public.is_admin());
drop policy if exists "admins delete subscribers" on public.subscribers;
create policy "admins delete subscribers" on public.subscribers for delete using (public.is_admin());
drop policy if exists "admins update subscribers" on public.subscribers;
create policy "admins update subscribers" on public.subscribers for update using (public.is_admin());

drop policy if exists "admins read page views" on public.page_views;
create policy "admins read page views" on public.page_views for select using (public.is_admin());

-- ---------- storage: public bucket for photos and page textures ----------
insert into storage.buckets (id, name, public)
values ('programme', 'programme', true)
on conflict (id) do update set public = true;

drop policy if exists "programme public read" on storage.objects;
create policy "programme public read" on storage.objects for select using (bucket_id = 'programme');
drop policy if exists "programme admin insert" on storage.objects;
create policy "programme admin insert" on storage.objects for insert with check (bucket_id = 'programme' and public.is_admin());
drop policy if exists "programme admin update" on storage.objects;
create policy "programme admin update" on storage.objects for update using (bucket_id = 'programme' and public.is_admin());
drop policy if exists "programme admin delete" on storage.objects;
create policy "programme admin delete" on storage.objects for delete using (bucket_id = 'programme' and public.is_admin());
