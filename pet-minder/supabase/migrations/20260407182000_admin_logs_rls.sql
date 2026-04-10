-- admin_logs: RLS policies for append-only admin audit log.
-- Goal:
-- - Allow admins to INSERT their own audit rows.
-- - Allow admins to SELECT audit rows (optional but useful for debugging).
-- - No UPDATE / DELETE policies (append-only).

alter table public.admin_logs enable row level security;

drop policy if exists "admin_logs_insert_admin" on public.admin_logs;
drop policy if exists "admin_logs_select_admin" on public.admin_logs;

create policy "admin_logs_select_admin"
  on public.admin_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.roles r
      where r.user_id = auth.uid()
        and r.role_type = 'admin'
        and r.deleted_at is null
    )
  );

create policy "admin_logs_insert_admin"
  on public.admin_logs
  for insert
  to authenticated
  with check (
    admin_id = auth.uid()
    and exists (
      select 1
      from public.roles r
      where r.user_id = auth.uid()
        and r.role_type = 'admin'
        and r.deleted_at is null
    )
  );

