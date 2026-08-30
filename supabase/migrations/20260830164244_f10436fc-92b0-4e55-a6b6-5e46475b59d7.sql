CREATE TABLE public.handoff_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL DEFAULT 'Guest customer',
  customer_phone TEXT,
  order_id TEXT,
  order_status TEXT,
  issue TEXT,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  failures JSONB NOT NULL DEFAULT '[]'::jsonb,
  orders JSONB NOT NULL DEFAULT '[]'::jsonb,
  state TEXT NOT NULL DEFAULT 'handoff_requested',
  agent_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  connected_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

GRANT SELECT, INSERT, UPDATE ON public.handoff_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handoff_sessions TO authenticated;
GRANT ALL ON public.handoff_sessions TO service_role;

ALTER TABLE public.handoff_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo handoff sessions are readable by everyone"
  ON public.handoff_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can request a handoff"
  ON public.handoff_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update a handoff call state"
  ON public.handoff_sessions FOR UPDATE USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_handoff_sessions()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER handoff_sessions_touch
  BEFORE UPDATE ON public.handoff_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_handoff_sessions();

ALTER TABLE public.handoff_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.handoff_sessions;