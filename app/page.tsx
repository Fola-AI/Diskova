import { ArrowRight, CalendarDays, MapPin, Radio } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search/search-box";
import { BRAND_NAME, SEASON_NAME } from "@/lib/config";
import { listCities } from "@/lib/db/directory";

export const revalidate = 300;

export default async function HomePage() {
  const cities = await listCities();
  return (
    <div className="relative overflow-hidden">
      {/* Photo-first hero placeholder: gradient stands in until live venue photos exist (L7). */}
      <section className="relative isolate px-4 pb-12 pt-10 sm:pt-16" aria-labelledby="hero-title">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(11,122,59,0.45),transparent_60%),radial-gradient(90%_60%_at_100%_20%,rgba(244,180,0,0.22),transparent_55%)]"
        />
        <div className="container max-w-3xl space-y-6 px-0">
          <Badge variant="outline" className="border-primary/50 bg-primary/10 text-foreground">
            <Radio className="h-3.5 w-3.5 text-positive" aria-hidden />
            Live from venues across Nigeria
          </Badge>
          <h1 id="hero-title" className="text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Where&apos;s the vibe <span className="text-accent">right now?</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            {BRAND_NAME} shows live crowd levels and photos from clubs, lounges, beaches and
            restaurants — plus the {SEASON_NAME} calendar, honest prices and city guides. No more
            scrolling Instagram to guess.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/c/lagos">
                Explore Lagos
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" disabled>
              <CalendarDays aria-hidden />
              {SEASON_NAME}
            </Button>
          </div>
          <SearchBox />
        </div>
      </section>

      <section className="container max-w-3xl" aria-labelledby="cities-title">
        <h2 id="cities-title" className="mb-4 text-xl font-semibold">
          Pick a city
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cities.map((city) => (
            <li key={city.slug}>
              <Link
                href={`/c/${city.slug}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/60"
              >
                <MapPin className="h-4 w-4 text-positive" aria-hidden />
                {city.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
