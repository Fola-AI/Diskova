import type { Metadata } from "next";
import Link from "next/link";

import { BRAND_NAME } from "@/lib/config";
import { listPublishedItineraries } from "@/lib/services/itineraries";

export const revalidate = 300;
export const metadata: Metadata = { title: "Itineraries", description: `Day-by-day plans for Nigerian cities with what things cost — from ${BRAND_NAME}.`, alternates: { canonical: "/itineraries" } };

export default async function ItinerariesIndex() {
  const items = await listPublishedItineraries();
  return (
    <div className="container max-w-3xl space-y-5 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Itineraries</h1>
        <p className="text-muted-foreground">Day-by-day plans with a running cost per person, in naira, pounds or dollars.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2" data-testid="itinerary-index">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={`/itineraries/${i.slug}`} className="block h-full rounded-xl border bg-card p-4 transition-colors hover:border-primary/60">
              <p className="text-xs text-muted-foreground">{i.days} day{i.days === 1 ? "" : "s"}{i.city ? ` · ${i.city.name}` : ""}</p>
              <h2 className="font-semibold">{i.title}</h2>
              {i.excerpt ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{i.excerpt}</p> : null}
            </Link>
          </li>
        ))}
        {!items.length ? <li className="text-sm text-muted-foreground">Itineraries are on their way.</li> : null}
      </ul>
    </div>
  );
}
