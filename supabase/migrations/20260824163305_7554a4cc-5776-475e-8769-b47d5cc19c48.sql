CREATE TABLE public.note_category_corrections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  note_text text NOT NULL,
  from_category text NOT NULL,
  to_category text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.note_category_corrections TO authenticated;
GRANT ALL ON public.note_category_corrections TO service_role;

ALTER TABLE public.note_category_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own note corrections"
ON public.note_category_corrections
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX note_category_corrections_user_created_idx
ON public.note_category_corrections (user_id, created_at DESC);