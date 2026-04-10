-- Link reviews to concrete bookings so each party can review each completed job once.

alter table public.reviews
  add column if not exists booking_id uuid references public.bookings (id) on delete cascade;

create index if not exists reviews_booking_id_idx
  on public.reviews (booking_id);

create unique index if not exists reviews_reviewer_booking_unique
  on public.reviews (reviewer_id, booking_id)
  where booking_id is not null;

comment on column public.reviews.booking_id is
  'Booking this review relates to. A user can submit at most one review per booking.';
