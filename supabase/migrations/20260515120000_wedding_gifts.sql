-- Gifts recorded from Paystack (webhook + verified client callback).
-- wedding_slug matches rsvps / guest_media ('primary').

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  wedding_slug text not null default 'primary',
  email citext not null,
  amount_subunit int not null check (amount_subunit > 0),
  currency text not null,
  reference text not null,
  guest_name text not null default '',
  status text not null default 'success' check (status in ('success', 'pending', 'failed')),
  created_at timestamptz not null default now(),
  unique (wedding_slug, reference)
);

create index if not exists gifts_wedding_email on public.gifts (wedding_slug, lower(email::text));
create index if not exists gifts_created on public.gifts (wedding_slug, created_at desc);

alter table public.gifts enable row level security;

create policy "gifts_select_own"
  on public.gifts for select to authenticated
  using (
    wedding_slug = 'primary'
    and lower(trim(email::text)) = lower(trim(auth.jwt() ->> 'email'))
  );
