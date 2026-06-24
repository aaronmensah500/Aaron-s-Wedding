-- Allow one email to RSVP for a small household/party.
-- The headcount lives in the existing `guests` column (default 1); `party_names`
-- holds the names of the ADDITIONAL guests the lead person is bringing
-- (i.e. excludes the lead guest themselves). Empty for solo RSVPs.
alter table public.rsvps
  add column if not exists party_names text[] not null default '{}';
