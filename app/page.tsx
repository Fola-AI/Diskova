import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SearchBox } from "@/components/search/search-box";
import { CitySwitcher } from "@/components/tonight/city-switcher";
import { TonightView } from "@/components/tonight/tonight-view";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { DEFAULT_CITY_SLUG } from "@/lib/config";
import { siteJsonLd } from "@/lib/content/jsonld";
import { getCityBySlug, listCities } from "@/lib/db/directory";

export const revalidate = 60;
export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Tonight view for the default city; signed-in users are taken to their home city (§8.1). */
export default async function HomePage() {
  const [city, cities] = await Promise.all([getCityBySlug(DEFAULT_CITY_SLUG), listCities()]);
  if (!city) notFound();
  return (
    <div className="container max-w-6xl space-y-4 px-4 py-3">
      <JsonLd data={siteJsonLd()} />
      <CitySwitcher cities={cities} current={city.slug} redirectToHome />
      <TonightView city={city} search={<SearchBox />} />
      <div className="pt-6">
        <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
          <Link href={`/c/${city.slug}#places`}>
            Explore every place in {city.name} <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
