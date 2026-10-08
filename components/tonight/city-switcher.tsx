"use client";

import { LocateFixed, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getMyHomeCityAction } from "@/app/actions/home-city";
import { chipClass } from "@/components/ui/chip";
import { hasAuthCookie } from "@/lib/client/auth-cookie";
import { getPositionOnce } from "@/lib/client/geo";

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
 * "Near me" (explicit, one-off geolocation) or pick a city. The current city scrolls into view.
 */
export function CitySwitcher({ cities, current, redirectToHome = false }: { cities: CityOption[]; current: string; redirectToHome?: boolean }) {
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const currentRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!redirectToHome || !hasAuthCookie()) return;
    void getMyHomeCityAction().then((slug) => {
      if (slug && slug !== current) router.replace(`/c/${slug}`);
    });
  }, [redirectToHome, current, router]);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [current]);

  return (
    <nav aria-label="Cities" className="rail fade-x -mx-4 gap-2 px-4 py-1">
      <button
        type="button"
        aria-busy={locating || undefined}
        onClick={async () => {
          setLocating(true);
          setNotFound(false);
          const pos = await getPositionOnce();
          setLocating(false);
          const c = pos ? nearest(cities, pos) : null;
          if (c) router.push(`/c/${c.slug}`);
          else setNotFound(true);
        }}
        className={chipClass(false)}
      >
        {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LocateFixed className="h-4 w-4" aria-hidden />}
        {locating ? "Locating…" : notFound ? "Location off" : "Near me"}
      </button>
      {cities.map((c) => (
        <Link
          key={c.slug}
          ref={c.slug === current ? currentRef : undefined}
          href={`/c/${c.slug}`}
          aria-current={c.slug === current ? "page" : undefined}
          className={chipClass(c.slug === current)}
        >
          {c.name}
        </Link>
      ))}
      <span className="w-2 shrink-0" aria-hidden />
    </nav>
  );
}
