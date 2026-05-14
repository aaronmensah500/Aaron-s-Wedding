-- Run in Supabase SQL editor or via: supabase db push
-- Creates the public `admin-media` bucket used by the site editor image uploader.
-- Uploads are performed server-side (service role key), so no client RLS policies
-- are needed for insert. Public bucket = no signed URLs required for display.

insert into storage.buckets (id, name, public)
values ('admin-media', 'admin-media', true)
on conflict (id) do nothing;
