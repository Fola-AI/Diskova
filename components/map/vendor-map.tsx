"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import Map, { Layer, Marker, NavigationControl, Source } from "react-map-gl/mapbox";

import { crowdClass, crowdLabel } from "@/lib/directory/crowd";
import { cn } from "@/lib/utils";

export interface MapPoint {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  lat: number;
  lng: number;
  /** Heat weight (§8.1: crowd_level_avg × (post_count + official_count × 3)). */
  weight?: number;
  crowd?: number;
}

/** The interactive Mapbox GL map. Only ever loaded through MapToggle (dynamic import). */
export default function VendorMap({
  token,
  center,
  zoom = 12,
  points,
  heat = false,
}: {
  token: string;
  center: { lat: number; lng: number };
  zoom?: number;
  points: MapPoint[];
  heat?: boolean;
}) {
  const [selected, setSelected] = useState<MapPoint | null>(null);
  const [heatReady, setHeatReady] = useState(false);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        properties: { weight: p.weight ?? 1 },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
    }),
    [points],
  );

  // Fit all pins when there are several; otherwise centre on the single point / city.
  const initialViewState =
    points.length > 1
      ? {
          bounds: [
            [Math.min(...points.map((p) => p.lng)), Math.min(...points.map((p) => p.lat))],
            [Math.max(...points.map((p) => p.lng)), Math.max(...points.map((p) => p.lat))],
          ] as [[number, number], [number, number]],
          fitBoundsOptions: { padding: 48, maxZoom: 15 },
        }
      : { latitude: center.lat, longitude: center.lng, zoom };

  return (
    <div className="relative h-full w-full" data-heat={heat ? "on" : "off"}>
      <Map
        mapboxAccessToken={token}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: "100%", height: "100%" }}
        attributionControl
        reuseMaps
        onIdle={(e) => {
          if (heat && !heatReady && e.target.getLayer("live-heat")) setHeatReady(true);
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {heat ? (
          <Source id="live" type="geojson" data={geojson}>
            <Layer
              id="live-heat"
              type="heatmap"
              maxzoom={17}
              paint={{
                "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 5, 0.4, 25, 1],
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 2],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 18, 15, 42],
                "heatmap-opacity": 0.8,
                "heatmap-color": [
                  "interpolate", ["linear"], ["heatmap-density"],
                  0, "rgba(0,0,0,0)",
                  0.2, "rgba(11,122,59,0.55)",
                  0.45, "rgba(244,180,0,0.75)",
                  0.7, "rgba(249,115,22,0.85)",
                  1, "rgba(239,68,68,0.95)",
                ],
              }}
            />
          </Source>
        ) : null}
        {points.map((p) => (
          <Marker
            key={p.id}
            latitude={p.lat}
            longitude={p.lng}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(p);
            }}
          >
            <button
              type="button"
              aria-label={p.name}
              className={cn("h-4 w-4 rounded-full border-2 border-white shadow-lg", p.crowd ? crowdClass(p.crowd) : "bg-[#0B7A3B]")}
            />
          </Marker>
        ))}
      </Map>
      {heatReady ? <span data-testid="heat-ready" hidden /> : null}

      {/* Tap a pin → bottom sheet */}
      {selected ? (
        <div className="absolute inset-x-2 bottom-2 rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur" role="dialog" aria-label={selected.name}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{selected.name}</p>
              <p className="text-xs text-muted-foreground">
                {selected.crowd ? `${crowdLabel(selected.crowd)} right now` : selected.subtitle}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md hover:bg-secondary">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <Link href={`/v/${selected.slug}`} className="mt-2 inline-block text-sm font-medium text-positive underline underline-offset-4">
            Open venue
          </Link>
        </div>
      ) : null}
    </div>
  );
}
