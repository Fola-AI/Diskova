import { format } from "date-fns";

import { AlertTriangle, BadgeCheck, ChevronDown } from "lucide-react";

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
      <h1 className="text-title font-semibold sm:text-display">Safety information</h1>
      <p className="text-footnote text-muted-foreground">Only publish information checked against an official source. Never promise any outcome from a report.</p>
      <section className="surface space-y-3 rounded-2xl p-4">
        <h2 className="text-callout font-semibold">New entry</h2>
        <SafetyForm v={{ city_id: null, section: "emergency_numbers", title: "", body_md: "", sort_order: 100 }} cities={cities} />
      </section>
      <ul className="space-y-3">
        {items.map((i) => {
          const verifier = (i as unknown as { verifier: { username: string } | null }).verifier;
          return (
            <li key={i.id} className="surface rounded-2xl" data-testid="safety-item">
              <div className="flex flex-wrap items-center gap-2 p-4 pb-2 text-sm">
                <Badge variant="outline">{i.section.replace(/_/g, " ")}</Badge>
                <span className="font-semibold">{i.title}</span>
                <span className="text-footnote text-muted-foreground">{i.city_id ? cityName.get(i.city_id) : "National"}</span>
                {i.last_verified_at ? <Badge variant="secondary"><BadgeCheck aria-hidden />verified {format(new Date(i.last_verified_at), "d MMM yyyy")}{verifier ? ` by @${verifier.username}` : ""}</Badge> : <Badge variant="destructive"><AlertTriangle aria-hidden />never verified</Badge>}
              </div>
              <details className="group">
                <summary className="hit mx-4 mb-2 inline-flex h-10 cursor-pointer list-none items-center gap-1 text-footnote font-semibold text-positive [&::-webkit-details-marker]:hidden">
                  Edit <ChevronDown className="h-4 w-4 transition-transform duration-micro group-open:rotate-180" aria-hidden />
                </summary>
                <div className="border-t p-4"><SafetyForm v={i} cities={cities} /></div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
