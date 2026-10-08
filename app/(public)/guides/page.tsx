import type { Metadata } from "next";
import { BookOpen, ChevronRight, Compass } from "lucide-react";
import Link from "next/link";

import { GuideCard } from "@/components/content/guide-card";
import { listCities } from "@/lib/db/directory";
import { listPublishedGuides } from "@/lib/db/guides";

export const revalidate = 300;
export const metadata: Metadata = { title: "City guides", description: "Honest, practical guides to going out in Nigeria's cities.", alternates: { canonical: "/guides" } };

export default async function GuidesIndex() {
  const [cities, latest] = await Promise.all([listCities(), listPublishedGuides({ types: ["city_guide", "area_guide", "daytime"], limit: 12 })]);
  return (
    <div className="container max-w-5xl space-y-8 px-4 py-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-display font-semibold sm:text-display-lg"><Compass className="h-8 w-8 text-accent" aria-hidden />City guides</h1>
        <p className="text-muted-foreground">Where to go, what it costs and how to get around — by people who live here.</p>
      </header>
      <nav aria-label="Cities" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cities.map((c) => (
          <Link key={c.slug} href={`/guides/${c.slug}`} className="surface pressable flex min-h-14 items-center justify-between rounded-2xl px-4 py-3 font-semibold hover:border-primary/50">
            {c.name}
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </nav>
      {latest.length ? (
        <section className="space-y-3">
          <h2 className="text-title font-semibold">Latest guides</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{latest.map((g) => <li key={g.id}><GuideCard guide={g} /></li>)}</ul>
        </section>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/toolkit" className="surface pressable-soft flex items-center gap-3 rounded-2xl p-4 hover:border-primary/50">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent"><BookOpen className="h-5 w-5" aria-hidden /></span>
          <span className="flex-1 text-sm"><span className="block font-semibold">Visiting from abroad?</span><span className="text-muted-foreground">Start with the diaspora toolkit.</span></span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Link>
        <Link href="/itineraries" className="surface pressable-soft flex items-center gap-3 rounded-2xl p-4 hover:border-primary/50">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-positive"><Compass className="h-5 w-5" aria-hidden /></span>
          <span className="flex-1 text-sm"><span className="block font-semibold">Planning a few days?</span><span className="text-muted-foreground">Day-by-day itineraries with costs in ₦, £ or $.</span></span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
