"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression, LatLngTuple, LeafletMouseEvent } from "leaflet";
import type { RouteResponse } from "@/lib/types";

const fallbackCenter: LatLngExpression = [20.5937, 78.9629];
const fallbackZoom = 5;
const locatedZoom = 14;

type LocationStatus = "locating" | "located" | "unavailable";

function CurrentLocationMarker({
  onStatusChange,
}: {
  onStatusChange: (status: LocationStatus) => void;
}) {
  const map = useMap();
  const [currentPosition, setCurrentPosition] =
    useState<LatLngExpression | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      onStatusChange("unavailable");
      return;
    }

    onStatusChange("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition: LatLngExpression = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        setCurrentPosition(nextPosition);
        map.flyTo(nextPosition, locatedZoom, { duration: 1 });
        onStatusChange("located");
      },
      () => {
        onStatusChange("unavailable");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  }, [map, onStatusChange]);

  if (!currentPosition) {
    return null;
  }

  return (
    <CircleMarker
      center={currentPosition}
      fillColor="#059669"
      fillOpacity={0.9}
      pathOptions={{ color: "#ffffff", weight: 3 }}
      radius={10}
    >
      <Popup>Your current location</Popup>
    </CircleMarker>
  );
}

function ClickPreviewMarker() {
  const [selectedPosition, setSelectedPosition] = useState<LatLngExpression | null>(
    null,
  );

  useMapEvents({
    click(event: LeafletMouseEvent) {
      setSelectedPosition([event.latlng.lat, event.latlng.lng]);
    },
  });

  if (!selectedPosition) {
    return null;
  }

  return (
    <CircleMarker
      center={selectedPosition}
      fillColor="#2563eb"
      fillOpacity={0.8}
      pathOptions={{ color: "#1d4ed8" }}
      radius={8}
      weight={2}
    >
      <Popup>Selected map point</Popup>
    </CircleMarker>
  );
}

function RouteLayer({ route }: { route: RouteResponse | null }) {
  const map = useMap();

  useEffect(() => {
    if (!route) {
      return;
    }

    const bounds = route.geometry.coordinates.map(([longitude, latitude]) => [
      latitude,
      longitude,
    ]) as LatLngTuple[];

    map.fitBounds(bounds, {
      padding: [32, 32],
    });
  }, [map, route]);

  if (!route) {
    return null;
  }

  const positions = route.geometry.coordinates.map(([longitude, latitude]) => [
    latitude,
    longitude,
  ]) as LatLngTuple[];

  return (
    <>
      <Polyline
        pathOptions={{ color: "#2563eb", opacity: 0.9, weight: 5 }}
        positions={positions}
      />
      <CircleMarker
        center={[route.origin.latitude, route.origin.longitude]}
        fillColor="#059669"
        fillOpacity={0.95}
        pathOptions={{ color: "#ffffff", weight: 3 }}
        radius={8}
      >
        <Popup>Origin</Popup>
      </CircleMarker>
      <CircleMarker
        center={[route.destination.latitude, route.destination.longitude]}
        fillColor="#dc2626"
        fillOpacity={0.95}
        pathOptions={{ color: "#ffffff", weight: 3 }}
        radius={8}
      >
        <Popup>Destination</Popup>
      </CircleMarker>
    </>
  );
}

export function EvMap({ route }: { route: RouteResponse | null }) {
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("locating");

  const mapOptions = useMemo(
    () => ({
      attributionControl: true,
      scrollWheelZoom: true,
    }),
    [],
  );

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden bg-slate-200 md:min-h-[calc(100vh-73px)]">
      <MapContainer
        center={fallbackCenter}
        className="h-full min-h-[520px] w-full md:min-h-[calc(100vh-73px)]"
        zoom={fallbackZoom}
        {...mapOptions}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CurrentLocationMarker onStatusChange={setLocationStatus} />
        <RouteLayer route={route} />
        <ClickPreviewMarker />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
        {locationStatus === "locating" && "Detecting your location..."}
        {locationStatus === "located" && "Map centered on your current location"}
        {locationStatus === "unavailable" &&
          "Location unavailable. Allow browser location access to center the map."}
      </div>
    </div>
  );
}
