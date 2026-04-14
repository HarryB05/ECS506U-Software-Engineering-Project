-- Expose a user-callable wrapper around bookings_auto_reject_stale_requests.
--
-- The underlying function is restricted to service_role (so it cannot be
-- called arbitrarily). This security-definer wrapper runs as the function
-- owner, meaning authenticated users can trigger an eager flush when the
-- bookings page loads without needing elevated privileges themselves.
--
-- The pg_cron job (every 10 minutes) remains the background safety net.
-- This wrapper just ensures the page always reflects current state.

create or replace function public.bookings_apply_auto_reject()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.bookings_auto_reject_stale_requests();
end;
$$;

revoke all on function public.bookings_apply_auto_reject() from public;
grant execute on function public.bookings_apply_auto_reject() to authenticated;
