-- Allow admins to update user rows (e.g. is_active for suspension).
-- Requires public.is_admin() from 20260407180000_admin_role_policies.sql.

drop policy if exists "users_update_admin" on public.users;

create policy "users_update_admin"
  on public.users
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
