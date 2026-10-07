import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FilterBar } from "@/components/directory/filter-bar";
import { VendorCard } from "@/components/directory/vendor-card";
import { MapToggle } from "@/components/map/map-toggle";
import { BRAND_NAME, MAPBOX_TOKEN } from "@/lib/config";
import { getCityBySlug } from "@/lib/db/directory";
import { staticMapUrl } from "@/lib/directory/links";
import { getCityDirectory } from "@/lib/services/directory";
import { parseCityFilters } from "@/lib/validation/directory";

type Params = Promise<{ city: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const city = await getCityBySlug((await params).city);
  if (!city) return {};
  const title = `What's on in ${city.name} right now`;
  const description = `Clubs, lounges, restaurants, beaches and more in ${city.name} — live crowd levels, prices and opening hours on ${BRAND_NAME}.`;
  return { title, description, alternates: { canonical: `/c/${city.slug}` }, openGraph: { title, description } };
}

export default async function CityPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const city = await getCityBySlug((await params).city);
  if (!city) notFound();
  const filters = parseCityFilters(await searchParams);
  const directory = await getCityDirectory(city, filters);
  const basePath = `/c/${city.slug}`;
  const center = { lat: city.lat ?? 6.5244, lng: city.lng ?? 3.3792 };

  return (
    <div className="container max-w-6xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{city.state} State · Nigeria</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">{city.name}</h1>
        <p className="text-sm text-muted-foreground">
          {directory.total} {directory.total === 1 ? "place" : "places"} listed
        </p>
      </header>

      <FilterBar basePath={basePath} filters={filters} categories={directory.categories} areas={directory.areas} />

      <MapToggle
        token={MAPBOX_TOKEN}
        center={center}
        zoom={11}
        staticImageUrl={city.hero_image_url ?? staticMapUrl(MAPBOX_TOKEN, center, { zoom: 11, width: 480, height: 220, retina: false })}
        eager
        points={directory.vendors
          .filter((v) => v.lat !== null && v.lng !== null)
          .map((v) => ({ id: v.id, slug: v.slug, name: v.name, subtitle: v.category?.name, lat: v.lat!, lng: v.lng! }))}
        label={`Map of ${directory.vendors.length} places`}
      />

      <section aria-labelledby="places-heading">
        <h2 id="places-heading" className="sr-only">Places in {city.name}</h2>
        {directory.vendors.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="vendor-grid">
            {directory.vendors.map((v, i) => (
              <li key={v.id}>
                <VendorCard vendor={v} priority={i < 2} />
              </li>
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
