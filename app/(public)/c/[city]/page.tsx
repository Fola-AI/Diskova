import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FilterBar } from "@/components/directory/filter-bar";
import { VendorCard } from "@/components/directory/vendor-card";
import type { MapPoint } from "@/components/map/vendor-map";
import { CitySwitcher } from "@/components/tonight/city-switcher";
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

  return (
    <div className="container max-w-6xl space-y-8 px-4 py-4">
      <CitySwitcher cities={cities} current={city.slug} />
      <TonightView city={city} mapPoints={mapPoints} />

      {FEATURES.qa ? (
        <Link href={`/c/${city.slug}/questions`} className="flex items-center justify-between rounded-xl border bg-card p-4 text-sm transition-colors hover:border-primary/60" data-testid="city-qa-link">
          <span><span className="font-medium">Questions about {city.name}?</span> <span className="text-muted-foreground">Ask locals and venues.</span></span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      <section id="places" aria-labelledby="places-heading" className="scroll-mt-20 space-y-4">
        <div>
          <h2 id="places-heading" className="text-2xl font-semibold">All places in {city.name}</h2>
          <p className="text-sm text-muted-foreground">{directory.total} {directory.total === 1 ? "place" : "places"} listed</p>
        </div>
        <FilterBar basePath={basePath} filters={filters} categories={directory.categories} areas={directory.areas} />
        {directory.vendors.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="vendor-grid">
            {directory.vendors.map((v) => (
              <li key={v.id}><VendorCard vendor={v} /></li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nothing matches those filters yet. Try clearing a filter.
          </div>
        )}
      </section>
    </div>
  );
}
