"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";

/** Draggable pin. Loaded only when the vendor chooses to adjust the location on a map. */
export default function LocationPickerMap({
  token,
  value,
  onChange,
}: {
  token: string;
  value: { lat: number; lng: number };
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  return (
    <Map
      mapboxAccessToken={token}
      initialViewState={{ latitude: value.lat, longitude: value.lng, zoom: 15 }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      style={{ width: "100%", height: "100%" }}
      onClick={(e) => onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <Marker
        latitude={value.lat}
        longitude={value.lng}
        draggable
        onDragEnd={(e) => onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
        color="#0B7A3B"
      />
    </Map>
  );
}
