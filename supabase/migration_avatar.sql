-- Add avatar support to posts (tweet posts show author avatar)
alter table public.posts
  add column if not exists avatar_url text;

alter table public.posts
  add column if not exists tweet_id text;
