-- Live bids table for realtime feed
create table if not exists public.live_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id text not null,
  user_name text not null,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- Index for fast per-auction queries sorted by newest first
create index if not exists live_bids_auction_created
  on public.live_bids (auction_id, created_at desc);

-- Enable Row Level Security
alter table public.live_bids enable row level security;

-- Anyone can read (the feed is public)
create policy "Public read" on public.live_bids
  for select using (true);

-- Anyone with the anon key can insert (harden with Edge Function in production)
create policy "Public insert" on public.live_bids
  for insert with check (
    char_length(auction_id) <= 128
    and char_length(user_name) <= 80
  );

-- Add to realtime publication for Supabase Realtime listeners
alter publication supabase_realtime add table public.live_bids;
