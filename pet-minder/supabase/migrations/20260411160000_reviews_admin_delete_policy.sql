-- Allow admins to delete reviews from the reviews table.
-- Without this policy, admin delete calls are silently blocked by RLS,
-- causing the "Remove review" button in the admin panel to appear to succeed
-- while the review persists on minder profiles.

create policy "reviews_delete_admin"
  on public.reviews
  for delete
  to authenticated
  using (public.is_admin());
