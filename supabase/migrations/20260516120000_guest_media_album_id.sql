-- Guest uploads grouped by album (matches CMS gallery.albums[].id)
alter table public.guest_media
  add column if not exists album_id text not null default 'general';

update public.guest_media set album_id = 'general' where album_id is null or album_id = '';

create index if not exists guest_media_wedding_album_created_idx
  on public.guest_media (wedding_slug, album_id, created_at desc);
