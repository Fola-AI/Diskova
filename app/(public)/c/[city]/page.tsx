import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowRight, MessagesSquare, SearchX } from "lucide-react";

import { FilterBar } from "@/components/directory/filter-bar";
import { VendorCard } from "@/components/directory/vendor-card";
import type { MapPoint } from "@/components/map/vendor-map";
import { SearchBox } from "@/components/search/search-box";
import { CitySwitcher } from "@/components/tonight/city-switcher";
import { SectionNav } from "@/components/tonight/section-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { TonightView } from "@/components/tonight/tonight-view";
import { BRAND_NAME, FEATURES } from "@/lib/config";
import { getCityBySlug, listCities } from "@/lib/db/directory";
import { getCityLive } from "@/lib/db/live";
import { getCityDirectory } from "@/lib/services/directory";
import { parseCityFilters } from "@/lib/validation/directory";

type Params = Promise<{ city: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const city = await getCityBySlug((await params).city);
  if (!city) return {};
  const title = `Tonight in ${city.name} — what's on right now`;
  const description = `Live crowd levels, photos and prices from clubs, lounges, restaurants and beaches in ${city.name} on ${BRAND_NAME}.`;
  return { title, description, alternates: { canonical: `/c/${city.slug}` }, openGraph: { title, description } };
}

export default async function CityPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const city = await getCityBySlug((await params).city);
  if (!city) notFound();
  const filters = parseCityFilters(await searchParams);
  const [directory, live, cities] = await Promise.all([getCityDirectory(city, filters), getCityLive(city.id), listCities()]);
  const basePath = `/c/${city.slug}`;

  // One map: heat from live venues, pins for every place matching the filters (live ones coloured by crowd).
  const liveById = new Map(live.map((l) => [l.vendor_id, l]));
  const mapPoints: MapPoint[] = directory.vendors
    .filter((v) => v.lat !== null && v.lng !== null)
    .map((v) => {
      const l = liveById.get(v.id);
      return { id: v.id, slug: v.slug, name: v.name, subtitle: v.category?.name, lat: v.lat!, lng: v.lng!, weight: l?.weight ?? 0, crowd: l?.crowd_level_avg };
    });

  const sections = [
    { id: "tonight", label: "Tonight" },
    { id: "places", label: `Places · ${directory.total}` },
    ...(FEATURES.qa ? [{ id: "questions", label: "Questions" }] : []),
  ];

  return (
    <div className="container max-w-6xl space-y-4 px-4 py-3">
      <CitySwitcher cities={cities} current={city.slug} />
      <SectionNav sections={sections} />
      <section id="tonight" aria-label={`Tonight in ${city.name}`} className="scroll-mt-28">
        <TonightView city={city} mapPoints={mapPoints} search={<SearchBox />} />
      </section>

      <section id="places" aria-labelledby="places-heading" className="scroll-mt-28 space-y-4 pt-10">
        <div className="space-y-1">
          <h2 id="places-heading" className="text-title font-semibold">All places in {city.name}</h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">{directory.total} {directory.total === 1 ? "place" : "places"} listed</p>
        </div>
        <FilterBar basePath={basePath} filters={filters} categories={directory.categories} areas={directory.areas} />
        {directory.vendors.length ? (
          <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" data-testid="vendor-grid">
            {directory.vendors.map((v) => (
              <li key={v.id}><VendorCard vendor={v} layout="row" /></li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={SearchX}
            title="Nothing matches yet"
            action={<Button asChild variant="secondary"><Link href={`${basePath}#places`}>Clear filters</Link></Button>}
          >
            Try removing a filter or picking another area.
          </EmptyState>
        )}
      </section>

      {FEATURES.qa ? (
        <section id="questions" aria-label="Questions" className="scroll-mt-28 pt-6">
          <Link href={`/c/${city.slug}/questions`} className="surface pressable-soft flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-primary/50" data-testid="city-qa-link">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-positive">
              <MessagesSquare className="h-6 w-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Questions about {city.name}?</span>
              <span className="block text-sm text-muted-foreground">Ask locals and venues.</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </section>
      ) : null}
    </div>
  );
}
