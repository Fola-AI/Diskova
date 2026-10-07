"use client";

import { Map as MapIcon, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import type { MapPoint } from "@/components/map/vendor-map";
import { Button } from "@/components/ui/button";

// Mapbox GL (≈ 1 MB) is fetched only when the visitor asks for the map (§2, §8.1).
const VendorMap = dynamic(() => import("@/components/map/vendor-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-secondary" aria-label="Loading map" />,
});

export function MapToggle({
  token,
  center,
  zoom,
  points,
  staticImageUrl,
  label = "Show map",
  eager = false,
  heat = false,
}: {
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
      <div className="relative h-40 overflow-hidden rounded-xl border sm:h-56">
        {staticImageUrl ? (
          // Static preview image: cheap first paint, no GL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staticImageUrl}
            alt=""
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            className="h-full w-full object-cover opacity-95" />
        ) : (
          <div className="h-full w-full bg-secondary" />
        )}
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-background/40 to-transparent">
          <Button type="button" onClick={() => setOpen(true)} data-testid="map-toggle">
            <MapIcon aria-hidden /> {label}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[60vh] min-h-[320px] overflow-hidden rounded-xl border" data-testid="map-container">
      <VendorMap token={token} center={center} zoom={zoom} points={points} heat={heat} />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute left-2 top-2 h-9 w-9"
        onClick={() => setOpen(false)}
        aria-label="Hide map"
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}
