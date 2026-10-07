import Link from "next/link";

import { ExportButton, SettingsForm } from "@/components/admin/settings-form";
import { Badge } from "@/components/ui/badge";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { requireRole } from "@/lib/auth/guards";
import { FEATURES } from "@/lib/config";
import { listPlatformExports } from "@/lib/services/admin/exports";

/** §11.14 settings — super_admin only (moderators and admins get a 404). */
export default async function AdminSettingsPage() {
  await requireRole("super_admin", "/admin/settings");
  const admin = getAdminSupabase();
  const [{ data: s }, { data: staff }, exportsList] = await Promise.all([
    admin.from("platform_settings").select("*").eq("id", 1).single(),
    admin.from("profiles").select("id, username, role").in("role", ["moderator", "admin", "super_admin"]).is("deleted_at", null).order("role"),
    listPlatformExports(),
  ]);
  if (!s) throw new Error("platform_settings row missing");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="rounded-xl border p-4"><SettingsForm v={s} /></section>

      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">Feature flags</h2>
        <p className="text-xs text-muted-foreground">Read-only. Set in the Vercel environment and redeploy to change.</p>
        <ul className="flex flex-wrap gap-2 text-sm" data-testid="feature-flags">
          {Object.entries(FEATURES).map(([k, on]) => <li key={k}><Badge variant={on ? "secondary" : "outline"}>{k}: {on ? "on" : "off"}</Badge></li>)}
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">Staff roles</h2>
        <p className="text-xs text-muted-foreground">Change a role from the user&apos;s page (requires a fresh MFA code).</p>
        <ul className="divide-y text-sm">
          {(staff ?? []).map((p) => (
            <li key={p.id} className="flex gap-2 py-1.5"><Link href={`/admin/users/${p.id}`} className="flex-1 underline-offset-4 hover:underline">@{p.username}</Link><Badge variant="outline">{p.role.replace("_", " ")}</Badge></li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">Data export</h2>
        <p className="text-xs text-muted-foreground">Gzipped JSON of content tables (cities, areas, categories, vendors, prices, events, guides, safety info, settings). No emails, IPs or auth data. Links below are valid for 10 minutes.</p>
        <ExportButton />
        <ul className="space-y-1 text-sm">
          {exportsList.map((f) => (
            <li key={f.name}>{f.url ? <a href={f.url} className="underline">{f.name}</a> : f.name} <span className="text-xs text-muted-foreground">{Math.round(f.size / 1024)} KB</span></li>
          ))}
        </ul>
      </section>

      <section className="space-y-1 rounded-xl border p-4">
        <h2 className="font-semibold">Agent API keys</h2>
        <p className="text-sm text-muted-foreground">Arrives with Stage P1.</p>
      </section>
    </div>
  );
}
