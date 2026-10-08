import Link from "next/link";

import { CreateAgentKeyForm, RevokeAgentKeyButton } from "@/components/admin/agent-keys";
import { ExportButton, SettingsForm } from "@/components/admin/settings-form";
import { Badge } from "@/components/ui/badge";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { requireRole } from "@/lib/auth/guards";
import { FEATURES } from "@/lib/config";
import { listAgentKeys } from "@/lib/services/admin/agent-keys";
import { listPlatformExports } from "@/lib/services/admin/exports";

/** §11.14 settings — super_admin only (moderators and admins get a 404). */
export default async function AdminSettingsPage() {
  await requireRole("super_admin", "/admin/settings");
  const admin = getAdminSupabase();
  const [{ data: s }, { data: staff }, exportsList, keys] = await Promise.all([
    admin.from("platform_settings").select("*").eq("id", 1).single(),
    admin.from("profiles").select("id, username, role").in("role", ["moderator", "admin", "super_admin"]).is("deleted_at", null).order("role"),
    listPlatformExports(),
    listAgentKeys(),
  ]);
  if (!s) throw new Error("platform_settings row missing");
  return (
    <div className="space-y-6">
      <h1 className="text-title font-semibold sm:text-display">Settings</h1>
      <section className="space-y-3">
        <h2 className="text-title font-semibold">Platform settings</h2>
        <SettingsForm v={s} />
      </section>

      <section className="surface space-y-3 rounded-2xl p-4">
        <h2 className="text-callout font-semibold">Feature flags</h2>
        <p className="text-footnote text-muted-foreground">Read-only. Set in the Vercel environment and redeploy to change.</p>
        <ul className="flex flex-wrap gap-2 text-sm" data-testid="feature-flags">
          {Object.entries(FEATURES).map(([k, on]) => <li key={k}><Badge variant={on ? "secondary" : "outline"}>{k}: {on ? "on" : "off"}</Badge></li>)}
        </ul>
      </section>

      <section className="surface space-y-3 rounded-2xl p-4">
        <h2 className="text-callout font-semibold">Staff roles</h2>
        <p className="text-footnote text-muted-foreground">Change a role from the user&apos;s page (requires a fresh MFA code).</p>
        <ul className="divide-y text-sm">
          {(staff ?? []).map((p) => (
            <li key={p.id} className="flex min-h-11 items-center gap-2 py-1"><Link href={`/admin/users/${p.id}`} className="hit flex-1 underline-offset-4 hover:underline">@{p.username}</Link><Badge variant="outline">{p.role.replace("_", " ")}</Badge></li>
          ))}
        </ul>
      </section>

      <section className="surface space-y-3 rounded-2xl p-4">
        <h2 className="text-callout font-semibold">Data export</h2>
        <p className="text-footnote text-muted-foreground">Gzipped JSON of content tables (cities, areas, categories, vendors, prices, events, guides, safety info, settings). No emails, IPs or auth data. Links below are valid for 10 minutes.</p>
        <ExportButton />
        <ul className="divide-y text-sm">
          {exportsList.map((f) => (
            <li key={f.name} className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 py-1">{f.url ? <a href={f.url} className="break-all font-medium underline underline-offset-4">{f.name}</a> : <span className="break-all">{f.name}</span>} <span className="text-footnote tabular-nums text-muted-foreground">{Math.round(f.size / 1024)} KB</span></li>
          ))}
        </ul>
      </section>

      <section id="agent-keys" className="surface scroll-mt-24 space-y-3 rounded-2xl p-4">
        <h2 className="text-callout font-semibold">Agent API keys</h2>
        <p className="text-footnote text-muted-foreground">
          For an AI agent reading the back office (<code>/api/agent/v1</code>, see <code>docs/agent-api.md</code>). Keys are shown once, expire
          (default 90 days), can be limited to IPs, and every call is audited. No moderation or sanction actions are exposed.
        </p>
        <ul className="divide-y text-sm" data-testid="agent-keys">
          {keys.map((k) => {
            const state = k.revoked_at ? "revoked" : new Date(k.expires_at) < new Date() ? "expired" : "active";
            return (
              <li key={k.id} className="flex flex-wrap items-center gap-2 py-3">
                <span className="font-semibold">{k.name}</span>
                <code className="font-mono text-footnote text-muted-foreground">{k.key_prefix}…</code>
                <Badge variant={state === "active" ? "secondary" : "outline"}>{state}</Badge>
                <span className="basis-full text-footnote text-muted-foreground sm:basis-auto">
                  {k.scopes.join(", ")} · expires {k.expires_at.slice(0, 10)}
                  {k.ip_allowlist?.length ? ` · IPs ${k.ip_allowlist.join(", ")}` : ""}
                  {k.last_used_at ? ` · last used ${k.last_used_at.slice(0, 16).replace("T", " ")}` : " · never used"}
                  {k.created_by_username ? ` · by @${k.created_by_username}` : ""}
                </span>
                {state === "active" ? <span className="ml-auto"><RevokeAgentKeyButton id={k.id} /></span> : null}
              </li>
            );
          })}
          {!keys.length ? <li className="py-2 text-muted-foreground">No keys yet.</li> : null}
        </ul>
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Create a key</h3>
          <CreateAgentKeyForm />
        </div>
      </section>
    </div>
  );
}
