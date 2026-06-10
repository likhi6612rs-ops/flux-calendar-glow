CREATE TABLE public.app_config (
  id integer PRIMARY KEY DEFAULT 1,
  app_version text NOT NULL DEFAULT '1.0.0',
  features jsonb NOT NULL DEFAULT '{"calendar":true,"tasks":true,"focus":true,"insights":true,"promo":false,"promo_text":""}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_config_singleton CHECK (id = 1)
);

GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app config"
  ON public.app_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert app config"
  ON public.app_config FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app config"
  ON public.app_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;