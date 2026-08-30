-- Free slots counter: global, stored on the round.
alter table public.rounds
  add column if not exists free_slots integer not null default 99;
