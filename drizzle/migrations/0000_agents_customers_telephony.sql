CREATE TYPE public.app_role AS ENUM ('admin', 'agent');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.agent_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Support agent',
  phone text,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.agent_profiles TO authenticated;
GRANT ALL ON public.agent_profiles TO service_role;
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents read agent profiles" ON public.agent_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'agent'));
CREATE POLICY "Agents edit own profile" ON public.agent_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Agents create own profile" ON public.agent_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_agent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent') ON CONFLICT DO NOTHING;
  INSERT INTO public.agent_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_agent AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_agent();

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  city text,
  tier text NOT NULL DEFAULT 'standard',
  lifetime_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents read customers" ON public.customers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'agent'));
CREATE POLICY "Agents add customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'agent'));
CREATE POLICY "Agents update customers" ON public.customers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'agent')) WITH CHECK (public.has_role(auth.uid(), 'agent'));

INSERT INTO public.customers (name, phone, email, city, tier, lifetime_value, notes) VALUES
('Aarav Sharma', '+919876502210', 'aarav.sharma@example.com', 'Bengaluru', 'gold', 48250, 'Prefers evening calls. Frequent electronics buyer.'),
('Priya Nair', '+919845011234', 'priya.nair@example.com', 'Kochi', 'platinum', 126400, 'VIP — escalate delivery issues immediately.'),
('Rohan Mehta', '+919820033456', 'rohan.mehta@example.com', 'Mumbai', 'standard', 8900, 'Two returns in last 90 days.'),
('Ananya Iyer', '+919884045678', 'ananya.iyer@example.com', 'Chennai', 'silver', 22150, NULL),
('Kabir Singh', '+919811056789', 'kabir.singh@example.com', 'New Delhi', 'gold', 61800, 'Business account, GST invoices required.'),
('Meera Joshi', '+919850067890', 'meera.joshi@example.com', 'Pune', 'standard', 4300, 'First-time customer.'),
('Vikram Rao', '+919849078901', 'vikram.rao@example.com', 'Hyderabad', 'silver', 18750, 'Hard of hearing — speak slowly.'),
('Sara Thomas', '+919895089012', 'sara.thomas@example.com', 'Thiruvananthapuram', 'platinum', 98300, NULL);

ALTER TABLE public.handoff_sessions ADD COLUMN customer_id uuid;
ALTER TABLE public.handoff_sessions ADD COLUMN channel text NOT NULL DEFAULT 'web';
ALTER TABLE public.handoff_sessions ADD COLUMN twilio_call_sid text;

CREATE TABLE public.callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  customer_name text NOT NULL DEFAULT 'Guest customer',
  phone text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  agent_id uuid,
  twilio_call_sid text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.callback_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.callback_requests TO authenticated;
GRANT ALL ON public.callback_requests TO service_role;
ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can request a callback" ON public.callback_requests FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND agent_id IS NULL AND twilio_call_sid IS NULL AND length(phone) BETWEEN 8 AND 20);
CREATE POLICY "Agents read callbacks" ON public.callback_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'agent'));
CREATE POLICY "Agents update callbacks" ON public.callback_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'agent')) WITH CHECK (public.has_role(auth.uid(), 'agent'));

CREATE TABLE public.phone_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL,
  kind text NOT NULL DEFAULT 'inbound',
  from_number text,
  to_number text,
  customer_id uuid,
  session_id uuid,
  callback_id uuid,
  agent_id uuid,
  twilio_call_sid text UNIQUE,
  status text NOT NULL DEFAULT 'queued',
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.phone_calls TO authenticated;
GRANT ALL ON public.phone_calls TO service_role;
ALTER TABLE public.phone_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents read phone calls" ON public.phone_calls FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'agent'));

CREATE TRIGGER customers_touch BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_handoff_sessions();
CREATE TRIGGER callback_requests_touch BEFORE UPDATE ON public.callback_requests FOR EACH ROW EXECUTE FUNCTION public.touch_handoff_sessions();
CREATE TRIGGER phone_calls_touch BEFORE UPDATE ON public.phone_calls FOR EACH ROW EXECUTE FUNCTION public.touch_handoff_sessions();
CREATE TRIGGER agent_profiles_touch BEFORE UPDATE ON public.agent_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_handoff_sessions();

ALTER TABLE public.callback_requests REPLICA IDENTITY FULL;
ALTER TABLE public.phone_calls REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.callback_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_calls;