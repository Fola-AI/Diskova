"use client";

import { Crosshair, Map as MapIcon, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const LocationPickerMap = dynamic(() => import("@/components/map/location-picker-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-secondary" />,
});

export function LocationPicker({
  token,
  value,
  onChange,
  areaName,
}: {
  token: string;
  value: { lat: number; lng: number };
  onChange: (v: { lat: number; lng: number }) => void;
  areaName: string | null;
}) {
  const [showMap, setShowMap] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function useMyLocation() {
    setGeoError(null);
    if (!navigator.geolocation) return setGeoError("Your browser can't share location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("We couldn't get your location. You can drag the pin on the map instead."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-2">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden />
        <span>
          Pin: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          {areaName ? ` (starts at the centre of ${areaName} — adjust it so riders find you)` : ""}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={useMyLocation}>
          <Crosshair aria-hidden /> I&apos;m at the venue — use my location
        </Button>
        {token ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowMap((s) => !s)}>
            <MapIcon aria-hidden /> {showMap ? "Hide map" : "Adjust on map"}
          </Button>
        ) : null}
      </div>
      {geoError ? <p className="text-xs text-destructive">{geoError}</p> : null}
      {showMap ? (
        <div className="h-72 overflow-hidden rounded-xl border">
          <LocationPickerMap token={token} value={value} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}
