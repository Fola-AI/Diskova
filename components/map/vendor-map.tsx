"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import Link from "next/link";
import { useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/mapbox";

export interface MapPoint {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  lat: number;
  lng: number;
}

/** The interactive Mapbox GL map. Only ever loaded through MapToggle (dynamic import). */
export default function VendorMap({
  token,
  center,
  zoom = 12,
  points,
}: {
  token: string;
  center: { lat: number; lng: number };
  zoom?: number;
  points: MapPoint[];
}) {
  const [selected, setSelected] = useState<MapPoint | null>(null);
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
    <Map
      mapboxAccessToken={token}
      initialViewState={initialViewState}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      style={{ width: "100%", height: "100%" }}
      attributionControl
      reuseMaps
    >
      <NavigationControl position="top-right" showCompass={false} />
      {points.map((p) => (
        <Marker
          key={p.id}
          latitude={p.lat}
          longitude={p.lng}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelected(p);
          }}
        >
          <button
            type="button"
            aria-label={p.name}
            className="h-4 w-4 rounded-full border-2 border-white bg-[#0B7A3B] shadow-lg"
          />
        </Marker>
      ))}
      {selected ? (
        <Popup
          latitude={selected.lat}
          longitude={selected.lng}
          anchor="top"
          onClose={() => setSelected(null)}
          closeOnClick={false}
          className="text-black"
        >
          <Link href={`/v/${selected.slug}`} className="block min-w-[140px] font-semibold underline">
            {selected.name}
          </Link>
          {selected.subtitle ? <span className="text-xs text-neutral-600">{selected.subtitle}</span> : null}
        </Popup>
      ) : null}
    </Map>
  );
}
