"use client";

import { Map as MapIcon, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import type { MapPoint } from "@/components/map/vendor-map";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

// Mapbox GL (≈ 1 MB) is fetched only when the visitor asks for the map (§2, §8.1).
const VendorMap = dynamic(() => import("@/components/map/vendor-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-none" role="status" aria-label="Loading map" />,
});

export function MapToggle({
  token,
  center,
  zoom,
  points,
  staticImageUrl,
  label = "Show map",
  hint,
  eager = false,
  heat = false,
}: {
  /** Secondary line under the button label. */
  hint?: string;
  token: string;
  center: { lat: number; lng: number };
  zoom?: number;
  points: MapPoint[];
  staticImageUrl: string | null;
  label?: string;
  /** Above the fold (city page): load the preview eagerly with high priority — it is the LCP image. */
  eager?: boolean;
  /** Tonight view: heat layer weighted by crowd × activity. */
  heat?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!token) return null;

  if (!open) {
    return (
      <div className="surface group relative h-44 overflow-hidden rounded-2xl sm:h-60">
        {staticImageUrl ? (
          // Static preview image: cheap first paint, no GL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staticImageUrl}
            alt=""
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            className="h-full w-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-[1.02]" />
        ) : (
          <div className="h-full w-full bg-secondary" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-background/70 via-background/10 to-transparent">
          <Button type="button" size="lg" className="rounded-full px-6" onClick={() => { setOpen(true); trackEvent("map_opened", { heat }); }} data-testid="map-toggle">
            <MapIcon aria-hidden /> {label}
          </Button>
          {hint ? <span className="rounded-full bg-black/55 px-2.5 py-1 text-caption font-medium text-white/90 backdrop-blur">{hint}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="surface enter-fade relative h-[60vh] min-h-[320px] overflow-hidden rounded-2xl" data-testid="map-container">
      <VendorMap token={token} center={center} zoom={zoom} points={points} heat={heat} />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute left-2 top-2 rounded-full shadow-lg"
        onClick={() => setOpen(false)}
        aria-label="Hide map"
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}
