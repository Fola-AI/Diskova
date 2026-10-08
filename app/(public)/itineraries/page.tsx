import type { Metadata } from "next";
import { ChevronRight, Route } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";

import { BRAND_NAME } from "@/lib/config";
import { listPublishedItineraries } from "@/lib/services/itineraries";

export const revalidate = 300;
export const metadata: Metadata = { title: "Itineraries", description: `Day-by-day plans for Nigerian cities with what things cost — from ${BRAND_NAME}.`, alternates: { canonical: "/itineraries" } };

export default async function ItinerariesIndex() {
  const items = await listPublishedItineraries();
  return (
    <div className="container max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-1.5">
        <h1 className="text-display font-semibold">Itineraries</h1>
        <p className="text-callout text-muted-foreground">Day-by-day plans with a running cost per person, in naira, pounds or dollars.</p>
      </header>
      {items.length ? (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="itinerary-index">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/itineraries/${i.slug}`} className="surface pressable-soft flex h-full flex-col gap-2 rounded-2xl p-4 transition-colors hover:border-primary/50">
                <span className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  <Route className="h-4 w-4 text-positive" aria-hidden /> {i.days} day{i.days === 1 ? "" : "s"}{i.city ? ` · ${i.city.name}` : ""}
                </span>
                <h2 className="text-title font-semibold">{i.title}</h2>
                {i.excerpt ? <p className="line-clamp-2 text-sm text-muted-foreground">{i.excerpt}</p> : null}
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-footnote font-semibold text-positive">See the plan <ChevronRight className="h-4 w-4" aria-hidden /></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Route} title="Itineraries are on their way" data-testid="itinerary-index">
          We&apos;re writing day-by-day plans for each city. Check back soon.
        </EmptyState>
      )}
    </div>
  );
}
