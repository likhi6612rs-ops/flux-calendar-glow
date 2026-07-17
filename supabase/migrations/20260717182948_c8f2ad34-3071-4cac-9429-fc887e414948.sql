
-- 1. Profiles: display name + avatar url
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Allow viewing profile of a user you're connected to (for avatar/name display)
DROP POLICY IF EXISTS "Users can view connected profiles" ON public.profiles;
CREATE POLICY "Users can view connected profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.connections c
      WHERE (c.requester_id = auth.uid() AND c.connected_user_id = profiles.id)
         OR (c.connected_user_id = auth.uid() AND c.requester_id = profiles.id)
    )
  );

-- 3. Task permissions table
CREATE TABLE IF NOT EXISTS public.task_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_permissions TO authenticated;
GRANT ALL ON public.task_permissions TO service_role;

ALTER TABLE public.task_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages permissions" ON public.task_permissions
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Connector reads own permissions" ON public.task_permissions
  FOR SELECT TO authenticated
  USING (auth.uid() = connector_id);

CREATE INDEX IF NOT EXISTS idx_task_permissions_connector ON public.task_permissions(connector_id);
CREATE INDEX IF NOT EXISTS idx_task_permissions_task ON public.task_permissions(task_id);

-- 4. Security-definer helper: is this task shared with me?
CREATE OR REPLACE FUNCTION public.task_shared_with(_task_id uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_permissions
    WHERE task_id = _task_id AND connector_id = _viewer
  )
$$;

-- 5. Extend tasks SELECT to include shared tasks
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
CREATE POLICY "Users manage own tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view shared tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.task_shared_with(id, auth.uid()));

-- 6. Extend task_completions: allow reading + inserting on shared tasks
DROP POLICY IF EXISTS "Users can manage their own completions" ON public.task_completions;

CREATE POLICY "Users manage own completions" ON public.task_completions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view completions on shared tasks" ON public.task_completions
  FOR SELECT TO authenticated
  USING (public.task_shared_with(task_id, auth.uid()));

CREATE POLICY "Task owner views completions on their tasks" ON public.task_completions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_completions.task_id AND t.user_id = auth.uid()));

CREATE POLICY "Connector completes shared tasks" ON public.task_completions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.task_shared_with(task_id, auth.uid()));

CREATE POLICY "Connector removes own completions on shared tasks" ON public.task_completions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.task_shared_with(task_id, auth.uid()));

-- 7. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_permissions;
