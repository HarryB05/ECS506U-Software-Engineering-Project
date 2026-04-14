-- Demo-only cleanup: remove all current booking-related rows.
--
-- This migration is intentionally destructive and should be used only for
-- development/demo environments.

begin;

-- Reviews can reference bookings in some environments; clear them first.
delete from public.review_reports;
delete from public.reviews;

-- Child rows first to avoid FK issues regardless of FK delete actions.
delete from public.booking_pets;
delete from public.booking_request_pets;

-- Core booking rows.
delete from public.bookings;
delete from public.booking_requests;

commit;
