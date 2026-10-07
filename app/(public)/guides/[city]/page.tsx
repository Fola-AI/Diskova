import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuideCard } from "@/components/content/guide-card";
import { VendorCard } from "@/components/directory/vendor-card";
import { getCityBySlug, listCategories, listVendorsForCity } from "@/lib/db/directory";
import { listPublishedGuides } from "@/lib/db/guides";
import { cn } from "@/lib/utils";

export const revalidate = 300;

const TABS = [
  { key: "daytime", label: "Daytime", groups: ["daytime", "culture"], tag: "daytime" },
  { key: "nightlife", label: "Nightlife", groups: ["nightlife", "events", "stay_adjacent"], tag: "nightlife" },
  { key: "food", label: "Food", groups: ["food_drink"], tag: "food" },
] as const;

type Params = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const city = await getCityBySlug((await params).city);
  if (!city) return {};
  return { title: `${city.name} guide — daytime, nightlife and food`, alternates: { canonical: `/guides/${city.slug}` } };
}

/** City guide hub (§8.7) with Daytime / Nightlife / Food tabs. */
export default async function CityGuideHub({ params, searchParams }: { params: Params; searchParams: Promise<{ tab?: string }> }) {
  const city = await getCityBySlug((await params).city);
  if (!city) notFound();
  const tabParam = (await searchParams).tab;
  const tab = TABS.find((t) => t.key === tabParam) ?? TABS[0];
  const [guides, tagged, vendors, categories] = await Promise.all([
    listPublishedGuides({ types: ["city_guide", "area_guide", "daytime"], cityId: city.id, limit: 30 }),
    listPublishedGuides({ types: ["city_guide", "area_guide", "daytime", "blog"], cityId: city.id, tag: tab.tag, limit: 6 }),
    listVendorsForCity(city.id, { limit: 500 }),
    listCategories(),
  ]);
  const groupOf = new Map(categories.map((c) => [c.slug, c.group]));
  const picks = vendors.filter((v) => v.category && (tab.groups as readonly string[]).includes(groupOf.get(v.category.slug) ?? "")).slice(0, 12);

  return (
    <div className="container max-w-5xl space-y-8 px-4 py-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground"><Link href="/guides" className="hover:underline">Guides</Link> / {city.name}</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">{city.name} guide</h1>
        {city.intro_md ? <p className="max-w-2xl text-muted-foreground">{city.intro_md}</p> : null}
      </header>
      {guides.length ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Guides</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{guides.map((g) => <li key={g.id}><GuideCard guide={g} /></li>)}</ul>
        </section>
      ) : null}
      <section className="space-y-4">
        <nav aria-label="Guide sections" className="flex gap-2" role="tablist">
          {TABS.map((t) => (
            <Link key={t.key} role="tab" aria-selected={t.key === tab.key} href={`/guides/${city.slug}?tab=${t.key}`} scroll={false}
              className={cn("rounded-full border px-4 py-1.5 text-sm", t.key === tab.key ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60")}>
              {t.label}
            </Link>
          ))}
        </nav>
        {tagged.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tagged.map((g) => <li key={g.id}><GuideCard guide={g} /></li>)}</ul> : null}
        {picks.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="hub-picks">{picks.map((v) => <li key={v.id}><VendorCard vendor={v} /></li>)}</ul>
        ) : (
          <p className="text-sm text-muted-foreground">No {tab.label.toLowerCase()} places listed in {city.name} yet.</p>
        )}
      </section>
    </div>
  );
}
