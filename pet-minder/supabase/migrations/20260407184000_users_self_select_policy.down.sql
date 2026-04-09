-- Rollback: remove users self-select policy.

drop policy if exists "users_select_own_row" on public.users;

