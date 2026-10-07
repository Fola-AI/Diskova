import Link from "next/link";

import { EventDecisionForm } from "@/components/admin/event-decision-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";
import { SEASON_NAME } from "@/lib/config";
import { eventDateParts } from "@/lib/events/format";
import { listEventDuplicates, listEventsForReview, listUpcomingPublishedForAdmin } from "@/lib/services/admin/events";

/** Events admin (§11.6): approve/reject/feature/cancel, edit, duplicates finder. */
export default async function AdminEventsPage() {
  await requireRole("admin", "/admin/events");
  const [pending, upcoming, duplicates] = await Promise.all([listEventsForReview(), listUpcomingPublishedForAdmin(), listEventDuplicates()]);
  const meta = (e: unknown) => e as { city: { name: string } | null; submitter?: { username: string } | null };
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Events awaiting review ({pending.length})</h1>
        {!pending.length ? <p className="text-sm text-muted-foreground">Nothing to review.</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {pending.map((e) => (
            <Card key={e.id} data-testid="pending-event">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{e.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {eventDateParts(e.starts_at).long} · {meta(e).city?.name} · {e.venue_name_freeform} · by @{meta(e).submitter?.username ?? "unknown"}
                  {e.is_december_season ? <Badge variant="gold" className="ml-2">{SEASON_NAME}</Badge> : null}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/admin/events/${e.id}`} className="text-sm underline underline-offset-4">Edit</Link>
                <EventDecisionForm eventId={e.id} mode="pending" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Upcoming published</h2>
        <ul className="divide-y rounded-xl border">
          {upcoming.map((e) => (
            <li key={e.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]">
              <span>
                <Link href={`/events/${e.slug}`} className="font-medium hover:underline">{e.title}</Link>{" "}
                <Link href={`/admin/events/${e.id}`} className="text-xs text-muted-foreground underline">edit</Link>
                <span className="block text-xs text-muted-foreground">{eventDateParts(e.starts_at).long} · {meta(e).city?.name}{e.is_featured ? " · featured" : ""}</span>
              </span>
              <EventDecisionForm eventId={e.id} mode="published" featured={e.is_featured} />
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Possible duplicates ({duplicates.length})</h2>
        <p className="text-sm text-muted-foreground">Same city, same day, similar title. Cancel or reject the weaker one with a reason.</p>
        <ul className="divide-y rounded-xl border text-sm" data-testid="event-duplicates">
          {duplicates.map((d) => (
            <li key={`${d.a_id}-${d.b_id}`} className="flex flex-wrap gap-2 px-4 py-3">
              <Link href={`/admin/events/${d.a_id}`} className="underline">{d.a_title}</Link>
              <span className="text-muted-foreground">≈</span>
              <Link href={`/admin/events/${d.b_id}`} className="underline">{d.b_title}</Link>
              <span className="text-xs text-muted-foreground">{d.day} · {Math.round(d.similarity * 100)}% similar</span>
            </li>
          ))}
          {!duplicates.length ? <li className="px-4 py-3 text-muted-foreground">None found.</li> : null}
        </ul>
      </section>
    </div>
  );
}
