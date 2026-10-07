"use client";

import { LocateFixed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getMyHomeCityAction } from "@/app/actions/home-city";
import { hasAuthCookie } from "@/lib/client/auth-cookie";
import { getPositionOnce } from "@/lib/client/geo";
import { cn } from "@/lib/utils";

interface CityOption {
  slug: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

function nearest(cities: CityOption[], p: { lat: number; lng: number }): CityOption | null {
  let best: CityOption | null = null;
  let bestD = Infinity;
  for (const c of cities) {
    if (c.lat === null || c.lng === null) continue;
    const d = (c.lat - p.lat) ** 2 + (c.lng - p.lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * City choice (§8.1): signed-in users with a home city are taken there; anyone can tap
 * "Near me" (explicit, one-off geolocation) or pick a city.
 */
export function CitySwitcher({ cities, current, redirectToHome = false }: { cities: CityOption[]; current: string; redirectToHome?: boolean }) {
  const router = useRouter();
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!redirectToHome || !hasAuthCookie()) return;
    void getMyHomeCityAction().then((slug) => {
      if (slug && slug !== current) router.replace(`/c/${slug}`);
    });
  }, [redirectToHome, current, router]);

  return (
    <nav aria-label="Cities" className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none]">
      <button
        type="button"
        onClick={async () => {
          setLocating(true);
          const pos = await getPositionOnce();
          setLocating(false);
          const c = pos ? nearest(cities, pos) : null;
          if (c) router.push(`/c/${c.slug}`);
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 hover:border-primary/60"
      >
        <LocateFixed className="h-3.5 w-3.5" aria-hidden /> {locating ? "Locating…" : "Near me"}
      </button>
      {cities.map((c) => (
        <Link
          key={c.slug}
          href={`/c/${c.slug}`}
          aria-current={c.slug === current ? "page" : undefined}
          className={cn("shrink-0 rounded-full border px-3 py-1.5", c.slug === current ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60")}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
