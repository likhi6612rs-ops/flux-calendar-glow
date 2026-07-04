-- Lock down the internal generator: only the database/service role uses it
REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon, authenticated;

-- join_by_invite_code: signed-in users only
REVOKE ALL ON FUNCTION public.join_by_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_by_invite_code(text) TO authenticated;