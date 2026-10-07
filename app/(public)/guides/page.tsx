import type { Metadata } from "next";
import { BookOpen, Compass } from "lucide-react";
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
        <h1 className="flex items-center gap-2 text-3xl font-semibold sm:text-4xl"><Compass className="h-8 w-8 text-accent" aria-hidden />City guides</h1>
        <p className="text-muted-foreground">Where to go, what it costs and how to get around — by people who live here.</p>
      </header>
      <nav aria-label="Cities" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cities.map((c) => (
          <Link key={c.slug} href={`/guides/${c.slug}`} className="rounded-xl border bg-card px-4 py-3 font-medium hover:border-primary/60">{c.name}</Link>
        ))}
      </nav>
      {latest.length ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Latest guides</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{latest.map((g) => <li key={g.id}><GuideCard guide={g} /></li>)}</ul>
        </section>
      ) : null}
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4" aria-hidden /> Visiting from abroad? Start with the <Link href="/toolkit" className="underline">diaspora toolkit</Link>.
      </p>
    </div>
  );
}
