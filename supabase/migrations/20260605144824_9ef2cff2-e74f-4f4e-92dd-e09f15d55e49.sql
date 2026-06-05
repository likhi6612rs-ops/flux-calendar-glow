ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timer_completion_count integer NOT NULL DEFAULT 0;