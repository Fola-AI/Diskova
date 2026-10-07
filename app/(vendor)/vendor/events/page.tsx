import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { eventDateParts } from "@/lib/events/format";
import { getCurrentVendor } from "@/lib/services/vendors";

const STATUS: Record<string, string> = { draft: "Draft", pending_review: "In review", published: "Listed", cancelled: "Cancelled", rejected: "Not approved" };

export default async function VendorEventsPage() {
  const session = await requireVerifiedUser("/vendor/events");
  const current = await getCurrentVendor(session);
  if (!current) redirect("/vendor/onboarding");
  const { data } = await session.supabase
    .from("events")
    .select("id, slug, title, starts_at, status")
    .or(`vendor_id.eq.${current.id},venue_vendor_id.eq.${current.id}`)
    .order("starts_at", { ascending: false })
    .limit(100);
  return (
    <div className="space-y-5">
      <div>
        <Link href="/vendor" className="text-sm text-muted-foreground hover:underline">← Dashboard</Link>
        <h1 className="mt-2 text-3xl font-semibold">Events at {current.name}</h1>
      </div>
      <Button asChild><Link href={`/events/submit?vendor=${current.id}`}><Plus aria-hidden />Submit an event</Link></Button>
      {data?.length ? (
        <ul className="divide-y rounded-xl border">
          {data.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0">
                {e.status === "published" ? <Link href={`/events/${e.slug}`} className="font-medium hover:underline">{e.title}</Link> : <span className="font-medium">{e.title}</span>}
                <span className="block text-xs text-muted-foreground">{eventDateParts(e.starts_at).long}</span>
              </span>
              <span className="shrink-0 text-xs">{STATUS[e.status] ?? e.status}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No events yet. Listed events show on your page and in the city calendar.</p>
      )}
    </div>
  );
}
