-- 1. Invite code generator
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  done boolean := false;
BEGIN
  WHILE NOT done LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    done := NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = result);
  END LOOP;
  RETURN result;
END;
$$;

-- 2. New columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS privacy_show_tasks boolean NOT NULL DEFAULT true;

-- 3. Backfill invite codes for existing profiles
UPDATE public.profiles
SET invite_code = public.generate_invite_code()
WHERE invite_code IS NULL;

-- 4. Connections table
CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, connected_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their connections"
  ON public.connections FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can create their own connections"
  ON public.connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND requester_id <> connected_user_id);

CREATE POLICY "Users can delete their own connections"
  ON public.connections FOR DELETE TO authenticated
  USING (auth.uid() = requester_id);

-- 5. Secure join-by-code action
CREATE OR REPLACE FUNCTION public.join_by_invite_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid;
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

  INSERT INTO public.connections (requester_id, connected_user_id)
  VALUES (auth.uid(), target_id)
  ON CONFLICT (requester_id, connected_user_id) DO NOTHING;

  RETURN target_id;
END;
$$;

-- 6. Ensure new signups get an invite code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, mobile, email_verified, invite_code)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'mobile', ''),
    CASE WHEN lower(NEW.email) = 'likhi6612rs@gmail.com' THEN true ELSE false END,
    public.generate_invite_code()
  );

  IF lower(NEW.email) = 'likhi6612rs@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$$;