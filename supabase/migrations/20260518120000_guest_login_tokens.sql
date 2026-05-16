-- Per-guest / gifter login tokens (hashed). Host tokens stay in env (HOST_LOGIN_TOKENS).

alter table public.rsvps
  add column if not exists login_token_hash text;

alter table public.gifts
  add column if not exists login_token_hash text;

create unique index if not exists rsvps_login_token_hash_idx
  on public.rsvps (login_token_hash)
  where login_token_hash is not null;

create unique index if not exists gifts_login_token_hash_idx
  on public.gifts (login_token_hash)
  where login_token_hash is not null;
