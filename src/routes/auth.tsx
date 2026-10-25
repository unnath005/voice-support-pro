import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Headset, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Agent sign in · VERA Support Desk" },
      { name: "description", content: "Support agents sign in to answer live calls, callbacks and phone escalations." },
      { property: "og:title", content: "Agent sign in · VERA Support Desk" },
      { property: "og:description", content: "Secure sign in for the VERA human support desk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/agent" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/agent`, data: { display_name: name || undefined } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/agent" });
        else toast.success("Check your email", { description: "Confirm your address, then sign in." });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Toaster position="top-right" />
      <form onSubmit={submit} className="panel w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/50 bg-accent/10">
            <Headset className="h-4 w-4 text-accent" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold">Support Agent Desk</p>
            <p className="text-[11px] text-muted-foreground">{mode === "in" ? "Sign in to take calls" : "Create an agent account"}</p>
          </div>
        </div>
        {mode === "up" && (
          <input className="panel-inset w-full px-3 py-2 text-sm" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="panel-inset w-full px-3 py-2 text-sm" type="email" required placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="panel-inset w-full px-3 py-2 text-sm" type="password" required minLength={8} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-xs text-muted-foreground hover:text-foreground">
          {mode === "in" ? "New agent? Create an account" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
