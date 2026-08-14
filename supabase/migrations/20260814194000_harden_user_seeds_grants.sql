revoke all on public.user_seeds from public;
revoke all on public.user_seeds from anon;
revoke all on public.user_seeds from authenticated;

grant select, insert, update, delete on public.user_seeds to authenticated;
