-- ============================================================
-- FlameWall — Supabase schema (PostgreSQL)
-- Anonymous users: no accounts. Every visitor gets a UUID in
-- localStorage, used for votes (1 vote per user per post) and
-- optionally stored on posts.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ROUNDS
-- Each round lasts 24 hours. Winner gets 50% of the pot.
-- ============================================================
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default now() + interval '24 hours',
  pot_cents integer not null default 0,
  winner_post_id uuid,
  prize_cents integer,
  status text not null default 'active'
    check (status in ('active', 'closed', 'paid')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- POSTS
-- A paid post lives until the end of its round.
-- user_id is an anonymous UUID from the visitor's localStorage.
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id text,
  author_name text not null default 'anonymous',
  text text not null check (char_length(text) between 1 and 200),
  link text check (link is null or char_length(link) <= 300),
  avatar_url text,
  tweet_id text,
  votes integer not null default 0,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- VOTES
-- One vote per user per post (unique constraint).
-- user_id is an anonymous UUID from localStorage.
-- ============================================================
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists idx_posts_round on public.posts (round_id, votes desc);
create index if not exists idx_votes_post on public.votes (post_id);
create index if not exists idx_rounds_status on public.rounds (status);

-- ============================================================
-- INCREMENT POST VOTES (atomic)
-- ============================================================
create or replace function public.increment_post_votes(p_post_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  new_votes integer;
begin
  update public.posts
  set votes = votes + 1
  where id = p_post_id
  returning votes into new_votes;
  return coalesce(new_votes, 1);
end;
$$;

-- ============================================================
-- AUTO-CLOSE ROUNDS + DECLARE WINNER
-- Call via a scheduled pg_cron (Supabase Dashboard -> Cron)
-- ============================================================
create or replace function public.close_expired_rounds()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  closed integer := 0;
  r record;
  winner record;
begin
  for r in
    select * from public.rounds
    where status = 'active' and ends_at <= now()
  loop
    select * into winner
    from public.posts
    where round_id = r.id
    order by votes desc, created_at asc
    limit 1;

    update public.rounds
    set status = 'closed',
        winner_post_id = winner.id,
        prize_cents = floor(r.pot_cents / 2)
    where id = r.id;

    closed := closed + 1;
  end loop;

  return closed;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Public reads OK; writes only via service role (the /api layer).
-- ============================================================
alter table public.rounds enable row level security;
alter table public.posts enable row level security;
alter table public.votes enable row level security;

create policy "public can read rounds" on public.rounds
  for select using (true);

create policy "public can read posts" on public.posts
  for select using (true);

create policy "public can read votes" on public.votes
  for select using (true);
