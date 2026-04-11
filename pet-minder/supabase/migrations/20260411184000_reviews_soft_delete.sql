-- Add soft delete capability to reviews table
alter table public.reviews
  add column deleted_at timestamptz default null;

-- Create index on deleted_at for efficient filtering
create index if not exists reviews_deleted_at_idx
  on public.reviews (deleted_at);

-- Update comment
comment on column public.reviews.deleted_at is
  'Timestamp when review was soft-deleted by admin. NULL means review is active.';
