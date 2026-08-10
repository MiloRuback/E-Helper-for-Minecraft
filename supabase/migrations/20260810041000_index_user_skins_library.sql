create index if not exists user_skins_user_updated_at_idx
  on public.user_skins(user_id, updated_at desc);
