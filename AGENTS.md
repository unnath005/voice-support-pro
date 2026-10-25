<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Browser-to-browser handoff audio uses WebRTC with signalling over Cloud realtime broadcast — no media server needed.
- Phone calls go through Twilio via the connector gateway in `src/lib/twilio.server.ts`; webhooks live under `/api/public/twilio/*` and are authenticated by a shared `key` query token, because gateway connections expose no Twilio auth token for signature checks.
- Agent-only data (customers, callbacks, phone_calls) is gated by `has_role(auth.uid(),'agent')`; the agent desk lives under `_authenticated/`.
