import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { eventDateParts } from "@/lib/events/format";
import { getCurrentVendor } from "@/lib/services/vendors";
import { BackLink } from "@/components/ui/back-link";

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
        <BackLink href="/vendor">Dashboard</BackLink>
        <h1 className="mt-1 text-display font-semibold">Events at {current.name}</h1>
      </div>
      <Button asChild className="w-full sm:w-auto"><Link href={`/events/submit?vendor=${current.id}`}><Plus aria-hidden />Submit an event</Link></Button>
      {data?.length ? (
        <ul className="surface divide-y overflow-hidden rounded-2xl">
          {data.map((e) => (
            <li key={e.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0">
                {e.status === "published" ? <Link href={`/events/${e.slug}`} className="font-semibold hover:underline">{e.title}</Link> : <span className="font-semibold">{e.title}</span>}
                <span className="block text-footnote text-muted-foreground">{eventDateParts(e.starts_at).long}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-caption font-semibold ${e.status === "published" ? "bg-primary/15 text-positive" : e.status === "pending_review" ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"}`}>{STATUS[e.status] ?? e.status}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={CalendarDays} title="No events yet" compact>
          Listed events show on your page and in the city calendar.
        </EmptyState>
      )}
    </div>
  );
}
