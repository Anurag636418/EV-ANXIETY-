"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngTuple } from "leaflet";
import type { RouteResponse, ItinerarySegment } from "@/lib/types";

export type SimulationState = {
  isPlaying: boolean;
  progress: number; // 0.0 to 1.0
  speedMultiplier: number; // 1, 5, 20, 50
  followCar: boolean;
  currentSoc: number;
  coveredKm: number;
  totalKm: number;
  statusText: string;
  isCharging: boolean;
};

type TripSimulationLayerProps = {
  route: RouteResponse | null;
  itinerary?: ItinerarySegment[];
  simState: SimulationState;
  onUpdateState: (partial: Partial<SimulationState>) => void;
};

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function toDeg(r: number): number {
  return (r * 180) / Math.PI;
}

function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function TripSimulationLayer({
  route,
  itinerary = [],
  simState,
  onUpdateState,
}: TripSimulationLayerProps) {
  const map = useMap();
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const routeMetrics = useMemo(() => {
    if (
      !route ||
      !route.geometry.coordinates ||
      route.geometry.coordinates.length < 2
    ) {
      return null;
    }

    const coords = route.geometry.coordinates; // [lon, lat]
    const cumulativeDistances: number[] = [0];
    let totalDist = 0;

    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const d = haversineDistance(prev[1], prev[0], curr[1], curr[0]);
      totalDist += d;
      cumulativeDistances.push(totalDist);
    }

    return {
      coords,
      cumulativeDistances,
      totalDistKm: totalDist || 0.001,
    };
  }, [route]);

  const currentSnapshot = useMemo(() => {
    if (!routeMetrics) return null;

    const { coords, cumulativeDistances, totalDistKm } = routeMetrics;
    const targetDist =
      Math.max(0, Math.min(1, simState.progress)) * totalDistKm;

    let segmentIdx = 0;
    while (
      segmentIdx < cumulativeDistances.length - 2 &&
      cumulativeDistances[segmentIdx + 1] < targetDist
    ) {
      segmentIdx++;
    }

    const startDist = cumulativeDistances[segmentIdx];
    const endDist = cumulativeDistances[segmentIdx + 1] || totalDistKm;
    const segSpan = Math.max(0.0001, endDist - startDist);
    const segT = Math.max(0, Math.min(1, (targetDist - startDist) / segSpan));

    const p1 = coords[segmentIdx];
    const p2 = coords[Math.min(coords.length - 1, segmentIdx + 1)];

    const curLat = p1[1] + (p2[1] - p1[1]) * segT;
    const curLon = p1[0] + (p2[0] - p1[0]) * segT;
    const heading = calculateBearing(p1[1], p1[0], p2[1], p2[0]);

    let dynamicSoc = 100;
    let isCurrentlyCharging = false;
    let statusText = "Cruising on highway";

    if (itinerary.length > 0) {
      let accumulatedLegDist = 0;
      for (const seg of itinerary) {
        if (seg.segment_type === "DRIVE") {
          const legDistKm = seg.distance_meters / 1000.0;
          if (targetDist <= accumulatedLegDist + legDistKm) {
            const legProgress = Math.max(
              0,
              Math.min(
                1,
                (targetDist - accumulatedLegDist) / Math.max(0.1, legDistKm),
              ),
            );
            dynamicSoc =
              seg.start_soc_percent -
              legProgress * (seg.start_soc_percent - seg.end_soc_percent);
            statusText = `Driving to ${seg.destination_name}`;
            break;
          }
          accumulatedLegDist += legDistKm;
          dynamicSoc = seg.end_soc_percent;
        } else if (seg.segment_type === "CHARGE") {
          const distToStop = Math.abs(targetDist - accumulatedLegDist);
          if (
            distToStop < 2.0 &&
            simState.progress > 0.05 &&
            simState.progress < 0.95
          ) {
            isCurrentlyCharging = true;
            dynamicSoc = seg.end_soc_percent;
            statusText = `⚡ Fast charging at ${seg.station.name}`;
          }
        }
      }
    } else {
      dynamicSoc = Math.max(8, 100 - (targetDist / totalDistKm) * 82);
    }

    return {
      lat: curLat,
      lon: curLon,
      heading,
      coveredKm: Math.round(targetDist * 10) / 10,
      totalKm: Math.round(totalDistKm * 10) / 10,
      soc: Math.round(dynamicSoc),
      isCurrentlyCharging,
      statusText,
    };
  }, [routeMetrics, simState.progress, itinerary]);

  const onUpdateStateRef = useRef(onUpdateState);
  useEffect(() => {
    onUpdateStateRef.current = onUpdateState;
  }, [onUpdateState]);

  const progressRef = useRef(simState.progress);
  useEffect(() => {
    progressRef.current = simState.progress;
  }, [simState.progress]);

  const speedMultiplierRef = useRef(simState.speedMultiplier);
  useEffect(() => {
    speedMultiplierRef.current = simState.speedMultiplier;
  }, [simState.speedMultiplier]);

  useEffect(() => {
    if (!simState.isPlaying || !routeMetrics) {
      lastTimeRef.current = null;
      return;
    }

    const { totalDistKm } = routeMetrics;
    const baseKmPerSec = 80 / 3600;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const deltaSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const distDeltaKm = baseKmPerSec * deltaSec * speedMultiplierRef.current;
      const progressDelta = distDeltaKm / totalDistKm;
      const nextProgress = progressRef.current + progressDelta;
      progressRef.current = nextProgress;

      if (nextProgress >= 1.0) {
        onUpdateStateRef.current({
          progress: 1.0,
          isPlaying: false,
          statusText: "Trip Completed! Arrived safely at destination.",
        });
      } else {
        onUpdateStateRef.current({
          progress: nextProgress,
        });
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [simState.isPlaying, routeMetrics]);

  const lastTelemetryRef = useRef<{
    soc: number;
    coveredKm: number;
    totalKm: number;
    isCharging: boolean;
    statusText: string;
  } | null>(null);

  useEffect(() => {
    if (!currentSnapshot) return;

    const prev = lastTelemetryRef.current;
    const hasChanged =
      !prev ||
      prev.soc !== currentSnapshot.soc ||
      prev.coveredKm !== currentSnapshot.coveredKm ||
      prev.totalKm !== currentSnapshot.totalKm ||
      prev.isCharging !== currentSnapshot.isCurrentlyCharging ||
      prev.statusText !== currentSnapshot.statusText;

    if (hasChanged) {
      lastTelemetryRef.current = {
        soc: currentSnapshot.soc,
        coveredKm: currentSnapshot.coveredKm,
        totalKm: currentSnapshot.totalKm,
        isCharging: currentSnapshot.isCurrentlyCharging,
        statusText: currentSnapshot.statusText,
      };

      onUpdateStateRef.current({
        currentSoc: currentSnapshot.soc,
        coveredKm: currentSnapshot.coveredKm,
        totalKm: currentSnapshot.totalKm,
        statusText: currentSnapshot.statusText,
        isCharging: currentSnapshot.isCurrentlyCharging,
      });
    }

    if (simState.followCar && simState.isPlaying) {
      map.setView([currentSnapshot.lat, currentSnapshot.lon], map.getZoom(), {
        animate: false,
      });
    }
  }, [
    currentSnapshot?.coveredKm,
    currentSnapshot?.soc,
    currentSnapshot?.isCurrentlyCharging,
    currentSnapshot?.statusText,
    simState.followCar,
    simState.isPlaying,
    map,
  ]);

  const carIcon = useMemo(() => {
    if (!currentSnapshot) return L.divIcon();

    return L.divIcon({
      className: "simulated-car-marker",
      html: `
        <div style="
          position: relative;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            inset: 3px;
            border-radius: 9999px;
            background: ${currentSnapshot.isCurrentlyCharging ? "rgba(16, 185, 129, 0.45)" : "rgba(14, 165, 233, 0.35)"};
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          
          <div style="
            position: relative;
            width: 38px;
            height: 38px;
            border-radius: 9999px;
            background: ${currentSnapshot.isCurrentlyCharging ? "#10b981" : "#0f172a"};
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${Math.round(currentSnapshot.heading)}deg);
            transition: transform 0.08s linear;
          ">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2L6 8v10a2 2 0 002 2h8a2 2 0 002-2V8l-6-6z" fill="${currentSnapshot.isCurrentlyCharging ? "#ecfdf5" : "#38bdf8"}" />
              <path d="M8 9h8l-1 4H9L8 9z" fill="#0f172a" />
              <path d="M9 16h6l-.5 2h-5L9 16z" fill="#0f172a" />
              <circle cx="7.5" cy="4.5" r="1" fill="#fef08a" />
              <circle cx="16.5" cy="4.5" r="1" fill="#fef08a" />
            </svg>
          </div>

          <div style="
            position: absolute;
            top: -18px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(4px);
            color: ${currentSnapshot.soc > 30 ? "#34d399" : currentSnapshot.soc > 15 ? "#fbbf24" : "#f87171"};
            border: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 10px;
            font-weight: 800;
            padding: 1px 6px;
            border-radius: 9999px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 2px;
          ">
            ${currentSnapshot.isCurrentlyCharging ? "⚡ " : ""}${currentSnapshot.soc}%
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }, [
    currentSnapshot?.isCurrentlyCharging,
    Math.round(currentSnapshot?.heading ?? 0),
    currentSnapshot?.soc,
  ]);

  if (!currentSnapshot) return null;

  return (
    <Marker
      position={[currentSnapshot.lat, currentSnapshot.lon] as LatLngTuple}
      icon={carIcon}
      zIndexOffset={2000}
    >
      <Popup closeButton={false} offset={[0, -20]}>
        <div className="p-1 text-xs space-y-1 font-sans">
          <div className="font-bold text-slate-900 flex items-center gap-1">
            <span>🚗 Simulated EV</span>
            <span className="text-emerald-600 font-extrabold">
              {currentSnapshot.soc}% SOC
            </span>
          </div>
          <p className="text-slate-600 text-[11px]">
            {currentSnapshot.statusText}
          </p>
          <div className="text-[10px] text-slate-400">
            {currentSnapshot.coveredKm} km / {currentSnapshot.totalKm} km
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
