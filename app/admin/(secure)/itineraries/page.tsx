import { ChevronRight, Plus, Route } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/guards";
import { listItinerariesAdmin } from "@/lib/services/itineraries";

/** P4 CMS: itineraries. */
export default async function AdminItinerariesPage() {
  await requireRole("admin", "/admin/itineraries");
  const rows = await listItinerariesAdmin();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-title font-semibold sm:text-display">Itineraries</h1>
        <Button asChild><Link href="/admin/itineraries/new"><Plus aria-hidden />New itinerary</Link></Button>
      </div>
      <ul className="surface divide-y rounded-2xl text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/itineraries/${r.id}`} className="group flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-micro hover:bg-secondary/40">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium group-hover:underline">{r.title}</span>
                <span className="text-footnote text-muted-foreground">{r.days} days · {(r.city as unknown as { name: string } | null)?.name ?? "Nigeria"}</span>
              </span>
              <Badge variant={r.status === "published" ? "secondary" : "outline"}>{r.status}</Badge>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
        {!rows.length ? <li className="p-2"><EmptyState icon={Route} title="No itineraries yet." compact className="border-0 shadow-none" /></li> : null}
      </ul>
    </div>
  );
}
