ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS transfer_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired'));