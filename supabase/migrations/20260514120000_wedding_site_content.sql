-- Published site copy (editor saves here; all guests read via /api/site-content).
-- wedding_slug matches rsvps / guest_media ('primary').

create table if not exists public.wedding_site_content (
  wedding_slug text primary key default 'primary',
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.wedding_site_content enable row level security;

-- No anon policies: reads/writes go through Astro API routes with service role.

create or replace function public.wedding_site_content_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wedding_site_content_updated_at on public.wedding_site_content;
create trigger wedding_site_content_updated_at
  before update on public.wedding_site_content
  for each row execute function public.wedding_site_content_set_updated_at();
