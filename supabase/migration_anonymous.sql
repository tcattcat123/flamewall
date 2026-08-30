-- ============================================================
-- FlameWall migration: anonymous users (no accounts)
-- ============================================================

-- votes: user_id is now a plain anonymous UUID (text), no FK to auth.users
alter table public.votes
  drop constraint if exists votes_user_id_fkey;

alter table public.votes
  alter column user_id drop not null,
  alter column user_id type text;

update public.votes set user_id = null where user_id = '';

-- posts: user_id becomes anonymous text, nullable
alter table public.posts
  drop constraint if exists posts_user_id_fkey;

alter table public.posts
  alter column user_id drop not null,
  alter column user_id type text;

update public.posts set user_id = null where user_id = '';

-- votes: allow NULL user_id? Better keep NOT NULL for 1-vote-per-user logic.
-- We re-add NOT NULL after converting (client always sends a UUID).
alter table public.votes alter column user_id set not null;
