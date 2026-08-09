create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  bio text not null default '',
  pronouns text not null default '',
  microsoft_gamertag text,
  minecraft_uuid text,
  minecraft_username text,
  skin_url text,
  avatar_head_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_skins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  skin_data text not null,
  model_type text not null check (model_type in ('slim', 'standard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  blueprint_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_modpacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  mc_version text not null,
  mod_loader text not null check (mod_loader in ('forge', 'fabric', 'quilt', 'vanilla')),
  description text not null default '',
  local_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_worlds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  local_path text,
  seed text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  language text not null default 'pt-br',
  theme text not null default 'dark',
  drive_sync_enabled boolean not null default false,
  microsoft_linked boolean not null default false,
  first_run_completed boolean not null default false,
  settings_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists user_skins_set_updated_at on public.user_skins;
create trigger user_skins_set_updated_at before update on public.user_skins for each row execute function public.set_updated_at();

drop trigger if exists user_blueprints_set_updated_at on public.user_blueprints;
create trigger user_blueprints_set_updated_at before update on public.user_blueprints for each row execute function public.set_updated_at();

drop trigger if exists user_modpacks_set_updated_at on public.user_modpacks;
create trigger user_modpacks_set_updated_at before update on public.user_modpacks for each row execute function public.set_updated_at();

drop trigger if exists user_worlds_set_updated_at on public.user_worlds;
create trigger user_worlds_set_updated_at before update on public.user_worlds for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Player'))
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_every_helper on auth.users;
create trigger on_auth_user_created_every_helper
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_skins enable row level security;
alter table public.user_blueprints enable row level security;
alter table public.user_modpacks enable row level security;
alter table public.user_worlds enable row level security;
alter table public.user_settings enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "user_skins_all_own" on public.user_skins for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_blueprints_all_own" on public.user_blueprints for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_modpacks_all_own" on public.user_modpacks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_worlds_all_own" on public.user_worlds for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_settings_all_own" on public.user_settings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
