
-- Revoke public/anon execute on task_shared_with; only authenticated needs it (used in RLS)
REVOKE EXECUTE ON FUNCTION public.task_shared_with(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.task_shared_with(uuid, uuid) FROM anon;

-- Tighten avatar SELECT policy: only owner or connected teammates
DROP POLICY IF EXISTS "Anyone signed in can view avatars" ON storage.objects;

CREATE POLICY "Users view own or connected avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.connections c
      WHERE (
        (c.requester_id = auth.uid() AND (c.connected_user_id)::text = (storage.foldername(name))[1])
        OR (c.connected_user_id = auth.uid() AND (c.requester_id)::text = (storage.foldername(name))[1])
      )
    )
  )
);
