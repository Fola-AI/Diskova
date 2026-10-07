import { ArrowRight, CalendarDays, MapPin, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRAND_NAME, SEASON_NAME } from "@/lib/config";

const LAUNCH_CITIES = ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Aba", "Owerri"] as const;

export default function HomePage() {
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
            <Radio className="h-3.5 w-3.5 text-primary" aria-hidden />
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
            <Button size="lg" className="w-full sm:w-auto" disabled>
              Tonight in Lagos
              <ArrowRight aria-hidden />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" disabled>
              <CalendarDays aria-hidden />
              {SEASON_NAME}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Launching soon.</p>
        </div>
      </section>

      <section className="container max-w-3xl" aria-labelledby="cities-title">
        <h2 id="cities-title" className="mb-4 text-xl font-semibold">
          Launch cities
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {LAUNCH_CITIES.map((city) => (
            <li
              key={city}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm"
            >
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              {city}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
