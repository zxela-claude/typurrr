-- Typurrr — Supabase Schema
-- Run in: Supabase Dashboard → SQL Editor → Run All

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text unique not null,
  avatar_cat text not null default 'orange' check (avatar_cat in ('orange','grey','tuxedo','calico','ghost_cat','neon_cat')),
  created_at timestamptz not null default now()
);

create table if not exists public.prompts (
  id     uuid primary key default gen_random_uuid(),
  text   text not null,
  source text not null default 'curated'
);

create table if not exists public.scores (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles on delete cascade,
  wpm       int not null,
  accuracy  numeric(5,2) not null,
  raw_wpm   int not null,
  prompt_id uuid references public.prompts,
  mode      text not null check (mode in ('solo','race')),
  race_id   uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.races (
  id          uuid primary key default gen_random_uuid(),
  room_code   text unique not null,
  prompt_id   uuid references public.prompts,
  status      text not null default 'lobby' check (status in ('lobby','countdown','racing','finished')),
  host_id     uuid not null references public.profiles,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);

create table if not exists public.race_participants (
  race_id   uuid not null references public.races on delete cascade,
  user_id   uuid not null references public.profiles on delete cascade,
  ready     boolean not null default false,
  position  int,
  score_id  uuid references public.scores,
  joined_at timestamptz not null default now(),
  primary key (race_id, user_id)
);

create table if not exists public.challenge_ghosts (
  id         uuid primary key default gen_random_uuid(),
  race_id    uuid not null references public.races on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  keystrokes jsonb not null,
  wpm        int not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles          enable row level security;
alter table public.prompts           enable row level security;
alter table public.scores            enable row level security;
alter table public.races             enable row level security;
alter table public.race_participants enable row level security;
alter table public.challenge_ghosts  enable row level security;

create policy "profiles_select"     on public.profiles          for select using (true);
create policy "profiles_insert"     on public.profiles          for insert with check (auth.uid() = id);
create policy "profiles_update"     on public.profiles          for update using (auth.uid() = id);
create policy "prompts_select"      on public.prompts           for select using (true);
create policy "prompts_insert"      on public.prompts           for insert with check (auth.uid() is not null);
create policy "scores_select"       on public.scores            for select using (true);
create policy "scores_insert"       on public.scores            for insert with check (auth.uid() = user_id);
create policy "races_select"        on public.races             for select using (true);
create policy "races_insert"        on public.races             for insert  with check (auth.uid() = host_id);
create policy "races_update"        on public.races             for update  using (auth.uid() = host_id);
create policy "participants_select" on public.race_participants for select using (true);
create policy "participants_insert" on public.race_participants for insert with check (auth.uid() = user_id);
-- Only allow participants to update their own ready flag; position/score_id are set server-side via host/recordFinish
create policy "participants_update_ready" on public.race_participants for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ghosts_select"       on public.challenge_ghosts  for select using (true);
create policy "ghosts_insert"       on public.challenge_ghosts  for insert with check (auth.uid() = user_id);

-- Return a single random prompt without fetching the full table client-side
create or replace function public.get_random_prompt()
returns setof public.prompts language sql security definer as $$
  select * from public.prompts order by random() limit 1;
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)||'_'||substring(new.id::text,1,4)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Seed prompts
insert into public.prompts (text) values
  ('the quick brown cat leaps over the lazy sleeping dog on a warm sunny afternoon in the garden'),
  ('pixel by pixel the retro arcade glows with phosphor light while cats prowl and pounce in the shadows'),
  ('type fast paws on keys meow louder than the clicking of the mechanical switches on the keyboard'),
  ('in the neon glow of the terminal the cat stretches and yawns then begins to type furiously'),
  ('whiskers twitch and claws click racing through words at the speed of a prowling cat in the dark'),
  ('the calico cat sat on the warm laptop keyboard and refused to move until given treats and chin scratches'),
  ('every keystroke brings the cat closer to victory as the cursor blinks in the phosphor green night'),
  ('cats do not race for glory they race because something moved and instinct took over the keyboard')
on conflict do nothing;
