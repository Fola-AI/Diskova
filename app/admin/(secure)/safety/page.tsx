import { format } from "date-fns";

import { SafetyForm } from "@/components/admin/safety-form";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/guards";
import { listSafetyAdmin } from "@/lib/services/admin/safety";

/** §11.7 safety_info editor. Entries show their last-verified date publicly. */
export default async function AdminSafetyPage() {
  await requireRole("admin", "/admin/safety");
  const { items, cities } = await listSafetyAdmin();
  const cityName = new Map(cities.map((c) => [c.id, c.name]));
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Safety information</h1>
      <p className="text-sm text-muted-foreground">Only publish information checked against an official source. Never promise any outcome from a report.</p>
      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-semibold">New entry</h2>
        <SafetyForm v={{ city_id: null, section: "emergency_numbers", title: "", body_md: "", sort_order: 100 }} cities={cities} />
      </section>
      <ul className="space-y-3">
        {items.map((i) => {
          const verifier = (i as unknown as { verifier: { username: string } | null }).verifier;
          return (
            <li key={i.id} className="rounded-xl border p-4" data-testid="safety-item">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{i.section.replace(/_/g, " ")}</Badge>
                <span className="font-medium">{i.title}</span>
                <span className="text-xs text-muted-foreground">{i.city_id ? cityName.get(i.city_id) : "National"}</span>
                {i.last_verified_at ? <Badge variant="secondary">verified {format(new Date(i.last_verified_at), "d MMM yyyy")}{verifier ? ` by @${verifier.username}` : ""}</Badge> : <Badge variant="destructive">never verified</Badge>}
              </div>
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">Edit</summary>
                <div className="mt-2"><SafetyForm v={i} cities={cities} /></div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
