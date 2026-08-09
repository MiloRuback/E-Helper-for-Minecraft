create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

create index if not exists user_skins_user_id_idx on public.user_skins(user_id);
create index if not exists user_blueprints_user_id_idx on public.user_blueprints(user_id);
create index if not exists user_modpacks_user_id_idx on public.user_modpacks(user_id);
create index if not exists user_worlds_user_id_idx on public.user_worlds(user_id);
