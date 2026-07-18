
-- 1. Active contracts table
CREATE TABLE public.active_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT active_contracts_date_order CHECK (end_date >= start_date),
  CONSTRAINT active_contracts_unique UNIQUE (owner_id, connector_id, task_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_contracts TO authenticated;
GRANT ALL ON public.active_contracts TO service_role;

ALTER TABLE public.active_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages contracts"
  ON public.active_contracts FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Connector reads contracts"
  ON public.active_contracts FOR SELECT TO authenticated
  USING (auth.uid() = connector_id);

CREATE POLICY "Connector self-removes contract"
  ON public.active_contracts FOR DELETE TO authenticated
  USING (auth.uid() = connector_id);

CREATE INDEX active_contracts_connector_idx ON public.active_contracts(connector_id);
CREATE INDEX active_contracts_owner_idx ON public.active_contracts(owner_id);

-- 2. Update task_shared_with to be driven by contracts (any existing contract grants base visibility;
--    date-range filtering happens per-day in the client).
CREATE OR REPLACE FUNCTION public.task_shared_with(_task_id uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.active_contracts
    WHERE task_id = _task_id AND connector_id = _viewer
  )
$$;
REVOKE EXECUTE ON FUNCTION public.task_shared_with(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.task_shared_with(uuid, uuid) TO authenticated, service_role;

-- 3. Max connectors on profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS max_connectors int NOT NULL DEFAULT 5;

-- 4. Enforce connector limit inside join RPC
CREATE OR REPLACE FUNCTION public.join_by_invite_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_id uuid;
  my_limit int;
  current_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO target_id
  FROM public.profiles
  WHERE invite_code = upper(trim(_code));
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot connect to yourself';
  END IF;

  SELECT COALESCE(max_connectors, 5) INTO my_limit
  FROM public.profiles WHERE id = auth.uid();

  SELECT COUNT(*) INTO current_count
  FROM public.connections WHERE requester_id = auth.uid();

  IF current_count >= my_limit THEN
    RAISE EXCEPTION 'Connection limit reached. Please remove a connector to add a new one.';
  END IF;

  INSERT INTO public.connections (requester_id, connected_user_id)
  VALUES (auth.uid(), target_id)
  ON CONFLICT (requester_id, connected_user_id) DO NOTHING;

  RETURN target_id;
END;
$$;
