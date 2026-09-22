"use client";

import { useEffect, useMemo, useState, memo } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
  Marker,
} from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression, LatLngTuple, LeafletMouseEvent } from "leaflet";
import type {
  ChargingStation,
  RouteResponse,
  ChargingRecommendation,
  Place,
  ItinerarySegment,
} from "@/lib/types";
import { ChargingLayer } from "@/components/ChargingLayer";
import {
  TripSimulationLayer,
  type SimulationState,
} from "@/components/TripSimulationLayer";

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
  const [position, setPosition] = useState<LatLngExpression | null>(null);
  const [heading, setHeading] = useState<number>(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      onStatusChange("unavailable");
      return;
    }

    onStatusChange("locating");

    let lastLat = 0;
    let lastLng = 0;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading: deviceHeading } = pos.coords;
        const newPosition: LatLngExpression = [latitude, longitude];

        // Calculate bearing if device doesn't provide heading
        let newHeading = deviceHeading;
        if (newHeading === null && lastLat !== 0) {
          const dy = longitude - lastLng;
          const dx = latitude - lastLat;
          let theta = Math.atan2(dy, dx) * (180 / Math.PI);
          newHeading = (theta + 360) % 360;
        }

        setPosition(newPosition);
        if (newHeading !== null) {
          setHeading(newHeading);
        }

        // Only fly on the very first lock
        if (lastLat === 0) {
          map.flyTo(newPosition, locatedZoom, { duration: 1 });
          onStatusChange("located");
        }

        lastLat = latitude;
        lastLng = longitude;
      },
      () => {
        onStatusChange("unavailable");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, onStatusChange]);

  if (!position) {
    return null;
  }

  // Create a custom DivIcon with an SVG car that rotates
  // We use CSS transition to make it move smoothly between GPS pulses
  const carIcon = L.divIcon({
    className: "moving-car-icon",
    html: `
      <div style="
        transform: rotate(${heading}deg);
        transition: transform 0.3s ease-out;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg viewBox="0 0 24 24" fill="#059669" width="24" height="24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <Marker position={position} icon={carIcon} zIndexOffset={1000}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

// Handles panning the map to preview inputs before planning
function PreviewLayer({
  route,
  previewOrigin,
  previewDestination,
}: {
  route: RouteResponse | null;
  previewOrigin: Place | null;
  previewDestination: Place | null;
}) {
  const map = useMap();

  useEffect(() => {
    // If a route exists, the RouteLayer takes over camera control
    if (route) return;

    if (previewOrigin && previewDestination) {
      const bounds: LatLngTuple[] = [
        [previewOrigin.latitude, previewOrigin.longitude],
        [previewDestination.latitude, previewDestination.longitude],
      ];
      map.fitBounds(bounds, {
        padding: [80, 80],
        animate: true,
        duration: 1.5,
      });
    } else if (previewOrigin) {
      map.flyTo([previewOrigin.latitude, previewOrigin.longitude], 12, {
        duration: 1,
      });
    } else if (previewDestination) {
      map.flyTo(
        [previewDestination.latitude, previewDestination.longitude],
        12,
        { duration: 1 },
      );
    }
  }, [map, route, previewOrigin, previewDestination]);

  if (route) return null; // Let RouteLayer draw the pins instead

  return (
    <>
      {previewOrigin && (
        <CircleMarker
          center={[previewOrigin.latitude, previewOrigin.longitude]}
          fillColor="#059669"
          fillOpacity={1}
          pathOptions={{ color: "#ffffff", weight: 3 }}
          radius={9}
        >
          <Popup className="font-semibold text-slate-800">Origin Preview</Popup>
        </CircleMarker>
      )}

      {previewDestination && (
        <CircleMarker
          center={[previewDestination.latitude, previewDestination.longitude]}
          fillColor="#ef4444"
          fillOpacity={1}
          pathOptions={{ color: "#ffffff", weight: 3 }}
          radius={9}
        >
          <Popup className="font-semibold text-slate-800">
            Destination Preview
          </Popup>
        </CircleMarker>
      )}
    </>
  );
}

const RouteLayer = memo(function RouteLayer({
  route,
}: {
  route: RouteResponse | null;
}) {
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
      padding: [80, 80], // extra padding since UI overlays the map
      animate: true,
      duration: 1.5,
    });
  }, [map, route]); // 'route' reference is stable per planTrip response

  if (!route) {
    return null;
  }

  const positions = route.geometry.coordinates.map(([longitude, latitude]) => [
    latitude,
    longitude,
  ]) as LatLngTuple[];

  const originIcon = L.divIcon({
    className: "origin-pin",
    html: `
      <div style="position: relative; width: 28px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); width: 100%; height: 100%;">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.268 21.732 0 14 0z" fill="#059669"/>
          <circle cx="14" cy="14" r="5.5" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -38],
  });

  const destIcon = L.divIcon({
    className: "dest-pin",
    html: `
      <div style="position: relative; width: 28px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); width: 100%; height: 100%;">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.268 21.732 0 14 0z" fill="#dc2626"/>
          <circle cx="14" cy="14" r="5.5" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -38],
  });

  return (
    <>
      {/* Outer Glow / border for the route */}
      <Polyline
        pathOptions={{
          color: "#0369a1",
          opacity: 0.35,
          weight: 9,
          lineCap: "round",
          lineJoin: "round",
        }}
        positions={positions}
        smoothFactor={2}
      />

      {/* Vibrant Electric Blue Core */}
      <Polyline
        pathOptions={{
          color: "#0284c7",
          opacity: 0.95,
          weight: 5,
          lineCap: "round",
          lineJoin: "round",
        }}
        positions={positions}
        smoothFactor={2}
      />

      <Marker
        position={[route.origin.latitude, route.origin.longitude]}
        icon={originIcon}
        zIndexOffset={1600}
      >
        <Popup className="font-semibold text-slate-800">
          📍 Start: {route.origin.label}
        </Popup>
      </Marker>

      <Marker
        position={[route.destination.latitude, route.destination.longitude]}
        icon={destIcon}
        zIndexOffset={1600}
      >
        <Popup className="font-semibold text-slate-800">
          🏁 Destination: {route.destination.label}
        </Popup>
      </Marker>
    </>
  );
});

function StationFocusWatcher({
  focusedStation,
}: {
  focusedStation: ChargingStation | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (focusedStation) {
      map.flyTo([focusedStation.latitude, focusedStation.longitude], 15, {
        duration: 1.2,
      });
    }
  }, [map, focusedStation]);
  return null;
}

export function EvMap({
  route,
  stations = [],
  recommendation = null,
  previewOrigin = null,
  previewDestination = null,
  itinerary = [],
  isSimulating = false,
  simState = null,
  onUpdateSimState = null,
  focusedStation = null,
}: {
  route: RouteResponse | null;
  stations?: ChargingStation[];
  recommendation?: ChargingRecommendation | null;
  previewOrigin?: Place | null;
  previewDestination?: Place | null;
  itinerary?: ItinerarySegment[];
  isSimulating?: boolean;
  simState?: SimulationState | null;
  onUpdateSimState?: ((partial: Partial<SimulationState>) => void) | null;
  focusedStation?: ChargingStation | null;
}) {
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("locating");
  const [showLocationPill, setShowLocationPill] = useState(true);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (locationStatus === "located") {
      const timer = setTimeout(() => {
        setShowLocationPill(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowLocationPill(true);
    }
  }, [locationStatus]);

  const mapOptions = useMemo(
    () => ({
      attributionControl: true,
      scrollWheelZoom: true,
      zoomControl: false,
    }),
    [],
  );

  return (
    <div className="relative h-full w-full bg-slate-900">
      <MapContainer
        center={fallbackCenter}
        className="h-full w-full"
        zoom={fallbackZoom}
        ref={setMap}
        {...mapOptions}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_3t6w_1_da1b61a76dca3e7fca456dad"
        />
        <CurrentLocationMarker onStatusChange={setLocationStatus} />

        <PreviewLayer
          route={route}
          previewOrigin={previewOrigin}
          previewDestination={previewDestination}
        />

        <RouteLayer route={route} />

        <ChargingLayer stations={stations} recommendation={recommendation} />

        {isSimulating && simState && onUpdateSimState && (
          <TripSimulationLayer
            route={route}
            itinerary={itinerary}
            simState={simState}
            onUpdateState={onUpdateSimState}
          />
        )}

        <StationFocusWatcher focusedStation={focusedStation} />
      </MapContainer>

      {/* Custom Zoom Controls */}
      {map && (
        <div className="absolute right-4 bottom-8 md:bottom-24 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
          <button
            onClick={() => map.zoomIn()}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/95 backdrop-blur shadow-md text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors border border-slate-200/80 active:scale-95"
            aria-label="Zoom in"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={() => map.zoomOut()}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/95 backdrop-blur shadow-md text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors border border-slate-200/80 active:scale-95"
            aria-label="Zoom out"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      )}

      {showLocationPill && (
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 md:left-auto md:right-20 md:bottom-24 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur z-[1000] transition-opacity duration-500 text-center md:text-left mx-auto max-w-sm">
          {locationStatus === "locating" && "Detecting your location..."}
          {locationStatus === "located" &&
            "Map centered on your current location"}
          {locationStatus === "unavailable" &&
            "Location unavailable. Allow browser location access to center the map."}
        </div>
      )}
    </div>
  );
}
