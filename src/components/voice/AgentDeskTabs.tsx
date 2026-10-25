import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, PhoneOutgoing, Search, Save, Link2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getTelephonyStatus, startCallback, wireSupportNumber } from "@/lib/telephony.functions";
import { formatINR } from "@/lib/orders.data";
import { cn } from "@/lib/utils";

type Callback = {
  id: string;
  customer_name: string;
  phone: string;
  reason: string | null;
  status: string;
  last_error: string | null;
  created_at: string;
};

export function CallbacksPanel() {
  const [rows, setRows] = useState<Callback[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const dial = useServerFn(startCallback);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("callback_requests")
      .select("id, customer_name, phone, reason, status, last_error, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error("Could not load callbacks", { description: error.message });
    else setRows(data as Callback[]);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("callbacks")
      .on("postgres_changes", { event: "*", schema: "public", table: "callback_requests" }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xs uppercase tracking-[0.24em] text-muted-foreground">
        Callback requests · {rows.filter((r) => r.status === "pending").length} pending
      </h2>
      {rows.length === 0 && <div className="panel-inset p-4 text-xs text-muted-foreground">No callback requests yet.</div>}
      {rows.map((r) => (
        <div key={r.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">{r.customer_name}</p>
            <p className="font-mono text-xs text-muted-foreground">{r.phone}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{r.reason ?? "No reason given"}</p>
            {r.last_error && <p className="mt-1 text-xs text-destructive">{r.last_error}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest",
                r.status === "completed" && "border-success/40 text-success",
                r.status === "failed" && "border-destructive/40 text-destructive",
                r.status === "dialing" && "border-warning/40 text-warning",
                r.status === "pending" && "border-accent/40 text-accent",
              )}
            >
              {r.status}
            </span>
            <button
              type="button"
              disabled={busy === r.id || r.status === "dialing" || r.status === "completed"}
              onClick={async () => {
                setBusy(r.id);
                try {
                  await dial({ data: { callbackId: r.id } });
                  toast.success("Calling your phone", { description: "Answer it — you'll be connected to the customer." });
                } catch (e) {
                  toast.error("Callback failed", { description: e instanceof Error ? e.message : String(e) });
                } finally {
                  setBusy(null);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"
            >
              {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneOutgoing className="h-3.5 w-3.5" />}
              {r.status === "failed" ? "Retry call" : "Call back"}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  tier: string;
  lifetime_value: number;
  notes: string | null;
};

export function CustomersPanel() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "" });

  const load = useCallback(async () => {
    let query = supabase.from("customers").select("*").order("name").limit(100);
    if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`);
    const { data, error } = await query;
    if (error) toast.error("Could not load customers", { description: error.message });
    else setRows(data as Customer[]);
  }, [q]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 200);
    return () => clearTimeout(id);
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("customers").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      city: form.city.trim() || null,
    });
    if (error) return toast.error("Could not add customer", { description: error.message });
    toast.success("Customer added");
    setForm({ name: "", phone: "", email: "", city: "" });
    void load();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" className="panel-inset w-full max-w-sm px-3 py-2 text-sm" />
      </div>
      <form onSubmit={add} className="panel grid gap-2 p-4 sm:grid-cols-5">
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="panel-inset px-3 py-2 text-xs" />
        <input required pattern="\+?[0-9 ]{8,16}" placeholder="+91…" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="panel-inset px-3 py-2 text-xs" />
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="panel-inset px-3 py-2 text-xs" />
        <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="panel-inset px-3 py-2 text-xs" />
        <button className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Add customer</button>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{c.name}</p>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{c.tier}</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{c.phone}</p>
            <p className="text-xs text-muted-foreground">{[c.email, c.city].filter(Boolean).join(" · ")}</p>
            <p className="mt-2 text-xs">Lifetime value · <span className="font-mono">{formatINR(Number(c.lifetime_value))}</span></p>
            {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function SettingsPanel({ userId, onSaved }: { userId: string; onSaved: (name: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [available, setAvailable] = useState(true);
  const [tel, setTel] = useState<Awaited<ReturnType<typeof getTelephonyStatus>> | null>(null);
  const [wiring, setWiring] = useState(false);
  const status = useServerFn(getTelephonyStatus);
  const wire = useServerFn(wireSupportNumber);

  useEffect(() => {
    void supabase
      .from("agent_profiles")
      .select("display_name, phone, available")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setName(data.display_name);
        setPhone(data.phone ?? "");
        setAvailable(data.available);
      });
    status().then(setTel).catch((e) => setTel({ ok: false, error: String(e) }));
  }, [userId, status]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("agent_profiles")
      .upsert({ user_id: userId, display_name: name.trim() || "Support agent", phone: phone.trim() || null, available });
    if (error) return toast.error("Could not save", { description: error.message });
    onSaved(name.trim() || "Support agent");
    toast.success("Settings saved");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="panel space-y-3 p-5">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Your agent profile</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="panel-inset w-full px-3 py-2 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your mobile, e.g. +919876543210" className="panel-inset w-full px-3 py-2 text-sm" />
        <p className="text-xs text-muted-foreground">Phone calls and callbacks ring this number first, then connect you to the customer.</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> Available for calls
        </label>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Save className="h-4 w-4" /> Save
        </button>
      </form>

      <section className="panel space-y-3 p-5">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Phone line</p>
        {!tel ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : tel.ok ? (
          <>
            <p className="font-mono text-lg">{tel.number}</p>
            <p className={cn("flex items-center gap-2 text-sm", tel.wired ? "text-success" : "text-warning")}>
              {tel.wired ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {tel.wired ? "Incoming calls ring this desk." : "Incoming calls are not routed to this app yet."}
            </p>
            <p className="text-xs text-muted-foreground">Calls are routed to the published site: {tel.appUrl}</p>
            <button
              type="button"
              disabled={wiring}
              onClick={async () => {
                setWiring(true);
                try {
                  await wire();
                  setTel(await status());
                  toast.success("Support number connected");
                } catch (e) {
                  toast.error("Could not connect the number", { description: e instanceof Error ? e.message : String(e) });
                } finally {
                  setWiring(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm text-primary disabled:opacity-40"
            >
              {wiring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {tel.wired ? "Reconnect number" : "Route calls to this desk"}
            </button>
          </>
        ) : (
          <p className="text-sm text-destructive">{tel.error}</p>
        )}
      </section>
    </div>
  );
}
