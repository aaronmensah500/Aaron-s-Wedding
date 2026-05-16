-- RSVP approval workflow: pending until couple approves; existing rows stay approved.

alter table public.rsvps
  add column if not exists status text not null default 'pending';

alter table public.rsvps
  drop constraint if exists rsvps_status_check;

alter table public.rsvps
  add constraint rsvps_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- Existing guests keep access after deploy.
update public.rsvps set status = 'approved';

create index if not exists rsvps_wedding_status_updated_idx
  on public.rsvps (wedding_slug, status, updated_at desc);

-- guest_media: require approved RSVP (not just any row)
drop policy if exists "guest_media_select_attending" on public.guest_media;
create policy "guest_media_select_attending"
  on public.guest_media for select to authenticated
  using (
    exists (
      select 1 from public.rsvps r
      where lower(trim(r.email::text)) = lower(trim(auth.jwt() ->> 'email'))
        and r.attendance = 'yes'
        and r.status = 'approved'
        and r.wedding_slug = guest_media.wedding_slug
    )
  );

drop policy if exists "guest_media_insert_own_attending" on public.guest_media;
create policy "guest_media_insert_own_attending"
  on public.guest_media for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.rsvps r
      where lower(trim(r.email::text)) = lower(trim(auth.jwt() ->> 'email'))
        and r.attendance = 'yes'
        and r.status = 'approved'
        and r.wedding_slug = guest_media.wedding_slug
    )
  );

drop policy if exists "guest_media_storage_insert" on storage.objects;
create policy "guest_media_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'guest-media'
    and split_part(name, '/', 1) = auth.uid()::text
    and exists (
      select 1 from public.rsvps r
      where lower(trim(r.email::text)) = lower(trim(auth.jwt() ->> 'email'))
        and r.attendance = 'yes'
        and r.status = 'approved'
    )
  );

drop policy if exists "guest_media_storage_select_shared" on storage.objects;
create policy "guest_media_storage_select_shared"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'guest-media'
    and exists (
      select 1 from public.rsvps r
      where lower(trim(r.email::text)) = lower(trim(auth.jwt() ->> 'email'))
        and r.attendance = 'yes'
        and r.status = 'approved'
    )
  );
