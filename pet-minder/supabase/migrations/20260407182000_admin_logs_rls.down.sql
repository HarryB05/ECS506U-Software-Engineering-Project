-- Rollback: remove admin_logs RLS policies added in 20260407182000_admin_logs_rls.sql

drop policy if exists "admin_logs_insert_admin" on public.admin_logs;
drop policy if exists "admin_logs_select_admin" on public.admin_logs;

