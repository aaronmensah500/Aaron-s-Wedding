-- Run in Supabase SQL editor or via CLI: supabase db push
-- One wedding site: wedding_slug = 'primary'

create extension if not exists citext;

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  wedding_slug text not null default 'primary',
  email citext not null,
  full_name text not null,
  attendance text not null check (attendance in ('yes', 'no')),
  events text[] not null default '{}',
  guests int not null default 1,
  diet text[] not null default '{}',
  song text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_slug, email)
);

create table if not exists public.guest_media (
  id uuid primary key default gen_random_uuid(),
  wedding_slug text not null default 'primary',
  user_id uuid not null references auth.users (id) on delete cascade,
  object_path text not null,
  original_name text not null default '',
  created_at timestamptz not null default now(),
  unique (wedding_slug, object_path)
);

create index if not exists rsvps_email_lower on public.rsvps (lower(email::text));
create index if not exists guest_media_wedding on public.guest_media (wedding_slug, created_at desc);

alter table public.rsvps enable row level security;
alter table public.guest_media enable row level security;

-- Guests can read their own RSVP row when logged in (email must match JWT).
create policy "rsvp_select_own"
  on public.rsvps for select to authenticated
  using (lower(trim(email::text)) = lower(trim(auth.jwt() ->> 'email')));

-- No direct client writes to rsvps (API uses service role).
-- Optional: allow nothing from anon/authenticated on insert/update/delete.

create policy "guest_media_select_attending"
  on public.guest_media for select to authenticated
  using (
    exists (
      select 1 from public.rsvps r
      where lower(trim(r.email::text)) = lower(trim(auth.jwt() ->> 'email'))
        and r.attendance = 'yes'
        and r.wedding_slug = guest_media.wedding_slug
    )
  );

create policy "guest_media_insert_own_attending"
  on public.guest_media for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.rsvps r
      where lower(trim(r.email::text)) = lower(trim(auth.jwt() ->> 'email'))
        and r.attendance = 'yes'
        and r.wedding_slug = guest_media.wedding_slug
    )
  );

-- Private bucket; app uses signed URLs for viewing.
insert into storage.buckets (id, name, public)
values ('guest-media', 'guest-media', false)
on conflict (id) do nothing;

create policy "guest_media_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'guest-media'
    and split_part(name, '/', 1) = auth.uid()::text
    and exists (
      select 1 from public.rsvps r
      where lower(trim(r.email::text)) = lower(trim(auth.jwt() ->> 'email'))
        and r.attendance = 'yes'
    )
  );

create policy "guest_media_storage_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'guest-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Allow attending guests to read others' objects in same bucket (shared album).
create policy "guest_media_storage_select_shared"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'guest-media'
    and exists (
      select 1 from public.rsvps r
      where lower(trim(r.email::text)) = lower(trim(auth.jwt() ->> 'email'))
        and r.attendance = 'yes'
    )
  );
