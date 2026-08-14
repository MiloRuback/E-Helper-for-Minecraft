create extension if not exists "pgcrypto";

create table if not exists public.user_seeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  seed text not null,
  platform text not null check (platform in ('java', 'bedrock')),
  mc_version text not null,
  dimension text not null check (dimension in ('overworld', 'nether', 'end')),
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_seeds_user_seed_platform_version_dimension_key'
      and conrelid = 'public.user_seeds'::regclass
  ) then
    alter table public.user_seeds
      add constraint user_seeds_user_seed_platform_version_dimension_key
      unique (user_id, seed, platform, mc_version, dimension);
  end if;
end $$;

drop trigger if exists user_seeds_set_updated_at on public.user_seeds;
create trigger user_seeds_set_updated_at
  before update on public.user_seeds
  for each row execute function public.set_updated_at();

alter table public.user_seeds enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_seeds'
      and policyname = 'user_seeds_all_own'
  ) then
    create policy "user_seeds_all_own"
      on public.user_seeds
      for all
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

create index if not exists user_seeds_user_updated_at_idx
  on public.user_seeds(user_id, updated_at desc);

grant select, insert, update, delete on public.user_seeds to authenticated;
revoke all on public.user_seeds from anon;
