import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { listItinerariesAdmin } from "@/lib/services/itineraries";

/** P4 CMS: itineraries. */
export default async function AdminItinerariesPage() {
  await requireRole("admin", "/admin/itineraries");
  const rows = await listItinerariesAdmin();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Itineraries</h1>
        <Button asChild size="sm"><Link href="/admin/itineraries/new">New itinerary</Link></Button>
      </div>
      <ul className="divide-y rounded-xl border text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 p-3">
            <Link href={`/admin/itineraries/${r.id}`} className="flex-1 font-medium underline-offset-4 hover:underline">{r.title}</Link>
            <span className="text-xs text-muted-foreground">{r.days} days · {(r.city as unknown as { name: string } | null)?.name ?? "Nigeria"}</span>
            <Badge variant={r.status === "published" ? "secondary" : "outline"}>{r.status}</Badge>
          </li>
        ))}
        {!rows.length ? <li className="p-3 text-muted-foreground">No itineraries yet.</li> : null}
      </ul>
    </div>
  );
}
