-- Multi-day / holiday bookings: explicit end time on the request.

alter table public.booking_requests
  add column if not exists requested_end_datetime timestamptz;

comment on column public.booking_requests.requested_end_datetime is
  'When set, booking spans from requested_datetime through this instant; duration_minutes stores the computed span for reporting.';
