-- Allow authenticated users to read their own users row.
-- Required for reliable account-state checks (e.g., suspension via is_active).

drop policy if exists "users_select_own_row" on public.users;

create policy "users_select_own_row"
  on public.users
  for select
  to authenticated
  using (
    id = auth.uid()
    and deleted_at is null
  );

