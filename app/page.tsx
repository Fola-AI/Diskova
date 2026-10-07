import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SearchBox } from "@/components/search/search-box";
import { CitySwitcher } from "@/components/tonight/city-switcher";
import { TonightView } from "@/components/tonight/tonight-view";
import { Button } from "@/components/ui/button";
import { DEFAULT_CITY_SLUG } from "@/lib/config";
import { getCityBySlug, listCities } from "@/lib/db/directory";

export const revalidate = 60;

/** Tonight view for the default city; signed-in users are taken to their home city (§8.1). */
export default async function HomePage() {
  const [city, cities] = await Promise.all([getCityBySlug(DEFAULT_CITY_SLUG), listCities()]);
  if (!city) notFound();
  return (
    <div className="container max-w-6xl space-y-6 px-4 py-4">
      <CitySwitcher cities={cities} current={city.slug} redirectToHome />
      <TonightView city={city} />
      <SearchBox />
      <Button asChild variant="secondary" className="w-full sm:w-auto">
        <Link href={`/c/${city.slug}#places`}>
          Explore every place in {city.name} <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
