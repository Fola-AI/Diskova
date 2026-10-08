import { CalendarCheck, Pencil } from "lucide-react";
import Link from "next/link";

import { EventDecisionForm } from "@/components/admin/event-decision-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
        <h1 className="text-title font-semibold sm:text-display">Events awaiting review ({pending.length})</h1>
        {!pending.length ? <EmptyState icon={CalendarCheck} title="Nothing to review." compact>Submitted events appear here for approval.</EmptyState> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {pending.map((e) => (
            <Card key={e.id} data-testid="pending-event" className="flex flex-col">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-callout">{e.title}</CardTitle>
                <p className="text-footnote text-muted-foreground">
                  {eventDateParts(e.starts_at).long} · {meta(e).city?.name} · {e.venue_name_freeform} · by @{meta(e).submitter?.username ?? "unknown"}
                </p>
                {e.is_december_season ? <Badge variant="gold" className="self-start">{SEASON_NAME}</Badge> : null}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
                <Link href={`/admin/events/${e.id}`} className="hit inline-flex h-10 items-center gap-1.5 self-start text-sm font-semibold text-positive underline-offset-4 hover:underline">
                  <Pencil className="h-4 w-4" aria-hidden /> Edit
                </Link>
                <div className="mt-auto border-t pt-3">
                  <EventDecisionForm eventId={e.id} mode="pending" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-title font-semibold">Upcoming published</h2>
        <ul className="surface divide-y rounded-2xl">
          {upcoming.map((e) => (
            <li key={e.id} className="grid gap-3 p-4 text-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              <div className="min-w-0 space-y-0.5">
                <p className="flex flex-wrap items-center gap-x-3">
                  <Link href={`/events/${e.slug}`} className="font-semibold underline-offset-4 hover:underline">{e.title}</Link>
                  <Link href={`/admin/events/${e.id}`} className="hit inline-flex h-10 items-center text-footnote font-semibold text-positive underline-offset-4 hover:underline">edit</Link>
                </p>
                <p className="text-footnote text-muted-foreground">{eventDateParts(e.starts_at).long} · {meta(e).city?.name}{e.is_featured ? " · featured" : ""}</p>
              </div>
              <EventDecisionForm eventId={e.id} mode="published" featured={e.is_featured} />
            </li>
          ))}
          {!upcoming.length ? <li className="p-4 text-sm text-muted-foreground">No upcoming published events.</li> : null}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-title font-semibold">Possible duplicates ({duplicates.length})</h2>
        <p className="text-footnote text-muted-foreground">Same city, same day, similar title. Cancel or reject the weaker one with a reason.</p>
        <ul className="surface divide-y rounded-2xl text-sm" data-testid="event-duplicates">
          {duplicates.map((d) => (
            <li key={`${d.a_id}-${d.b_id}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3">
              <Link href={`/admin/events/${d.a_id}`} className="font-medium underline underline-offset-4">{d.a_title}</Link>
              <span className="text-muted-foreground" aria-label="similar to">≈</span>
              <Link href={`/admin/events/${d.b_id}`} className="font-medium underline underline-offset-4">{d.b_title}</Link>
              <span className="basis-full text-footnote text-muted-foreground">{d.day} · {Math.round(d.similarity * 100)}% similar</span>
            </li>
          ))}
          {!duplicates.length ? <li className="px-4 py-3 text-muted-foreground">None found.</li> : null}
        </ul>
      </section>
    </div>
  );
}
