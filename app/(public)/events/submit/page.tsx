import type { Metadata } from "next";
import Link from "next/link";

import { EventSubmitForm } from "@/components/events/event-submit-form";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { listAllAreas, listCities } from "@/lib/db/directory";

export const metadata: Metadata = { title: "Submit an event", robots: { index: false } };

export default async function SubmitEventPage({ searchParams }: { searchParams: Promise<{ vendor?: string }> }) {
  const session = await requireVerifiedUser("/events/submit");
  const [cities, areas, { data: mine }] = await Promise.all([
    listCities(),
    listAllAreas(),
    session.supabase
      .from("vendor_members")
      .select("vendor:vendors(id, name, city_id, status)")
      .eq("profile_id", session.user.id)
      .not("accepted_at", "is", null),
  ]);
  const myVenues = ((mine ?? []) as unknown as Array<{ vendor: { id: string; name: string; city_id: string; status: string } | null }>)
    .map((m) => m.vendor)
    .filter((v): v is { id: string; name: string; city_id: string; status: string } => Boolean(v));
  return (
    <div className="container max-w-2xl space-y-5 px-4 py-6">
      <div>
        <Link href="/events" className="text-sm text-muted-foreground hover:underline">← Events</Link>
        <h1 className="mt-2 text-3xl font-semibold">Submit an event</h1>
        <p className="text-sm text-muted-foreground">Free to list. Our team reviews every event before it appears.</p>
      </div>
      <EventSubmitForm
        cities={cities.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        areas={areas.map((a) => ({ id: a.id, name: a.name, city_id: a.city_id }))}
        myVenues={myVenues}
        defaultVendorId={(await searchParams).vendor ?? null}
      />
    </div>
  );
}
