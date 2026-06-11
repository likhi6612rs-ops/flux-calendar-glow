-- Belt-and-suspenders: a RESTRICTIVE policy is AND-combined with every other
-- policy, so even if a permissive owner-update policy is ever added, only
-- admins can UPDATE subscription_requests. This blocks self-approval of tiers.
CREATE POLICY "Only admins may modify subscription requests"
  ON public.subscription_requests
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));