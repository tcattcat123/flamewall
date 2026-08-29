-- ============================================================
-- FlameWall — Supabase schema (PostgreSQL)
-- Run in Supabase SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- One row per user, joined to auth.users
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  created_at timestamptz not null default now(),
  avatar_url text
);

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
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null default 'anonymous',
  text text not null check (char_length(text) between 1 and 200),
  link text check (link is null or char_length(link) <= 300),
  votes integer not null default 0,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- VOTES
-- One vote per user per post (unique constraint).
-- ============================================================
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
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
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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
