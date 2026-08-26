-- Tracks which approved guests have already been sent the programme, so a
-- re-run of the broadcast only targets people who have not received it yet.
-- NULL = not sent.
alter table public.rsvps
  add column if not exists program_sent_at timestamptz;
