"use client";

import { useState, memo, useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type {
  ChargingStation,
  ChargingRecommendation,
  ChargingAvailability,
} from "@/lib/types";
import { fetchChargingAvailability } from "@/lib/api";

type ChargingLayerProps = {
  stations: ChargingStation[];
  recommendation?: ChargingRecommendation | null;
};

function ChargingStationPopup({
  station,
  recommendation,
  isRecommended,
}: {
  station: ChargingStation;
  recommendation?: ChargingRecommendation | null;
  isRecommended: boolean;
}) {
  const [liveStatus, setLiveStatus] = useState<ChargingAvailability | null>(
    null,
  );
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const fetchAvailability = () => {
    if (station.provider_metadata?.supports_live_availability) {
      setIsLoadingLive(true);
      setLiveError(null);
      fetchChargingAvailability({
        station_id: station.id,
        provider_metadata: station.provider_metadata,
      })
        .then((data) => setLiveStatus(data))
        .catch((err) => {
          console.error("Live status error:", err);
          setLiveError(err.message || "Live status temporarily unavailable.");
        })
        .finally(() => setIsLoadingLive(false));
    }
  };

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {/* Station header */}
      <div className="border-b border-amber-100 pb-2">
        {isRecommended && (
          <div className="mb-2 inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-900 shadow-sm border border-amber-200">
            ⭐ Recommended
          </div>
        )}
        <p className="font-semibold text-slate-900 leading-tight">
          {station.name}
        </p>
        {station.operator && (
          <p className="text-xs text-slate-500 mt-0.5">{station.operator}</p>
        )}
        {station.provider_metadata && (
          <div className="mt-1 flex items-center justify-between">
            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
              Provided by {station.provider_metadata.provider}
            </span>
          </div>
        )}
      </div>

      {/* Address */}
      {station.address && (
        <div className="flex gap-1.5">
          <span className="text-amber-500 mt-0.5 shrink-0">📍</span>
          <p className="text-xs text-slate-600">{station.address}</p>
        </div>
      )}

      {/* Connectors */}
      {station.connectors.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-700 mb-1">
            ⚡ Connectors
          </p>
          <ul className="space-y-0.5">
            {station.connectors.map((connector, index) => (
              <li
                key={index}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-600">{connector.type_name}</span>
                {connector.power_kw !== null && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 shrink-0">
                    {connector.power_kw} kW
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Live Availability Status */}
      {station.provider_metadata?.supports_live_availability ? (
        <div className="pt-1 mt-1 border-t border-slate-100">
          {!liveStatus && !isLoadingLive && !liveError ? (
            <button
              onClick={fetchAvailability}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-3 rounded font-medium transition-colors"
            >
              Check Live Availability
            </button>
          ) : (
            <>
              <p className="text-xs font-medium mb-1 flex items-center gap-1">
                {isLoadingLive ? (
                  <span className="text-slate-400">
                    Loading live availability...
                  </span>
                ) : liveError ? (
                  <span className="text-red-500">{liveError}</span>
                ) : liveStatus ? (
                  <span
                    className={
                      liveStatus.status === "Available"
                        ? "text-emerald-600"
                        : liveStatus.status === "Occupied"
                          ? "text-red-600"
                          : "text-slate-500"
                    }
                  >
                    {liveStatus.status === "Available" && "🟢 "}
                    {liveStatus.status === "Occupied" && "🔴 "}
                    {liveStatus.status === "Unknown" && "⚪ "}
                    {liveStatus.status === "Out of Service" && "⚫ "}
                    {liveStatus.status}
                  </span>
                ) : null}
              </p>
              {liveStatus && (
                <div className="text-[11px] text-slate-500">
                  <p>
                    {liveStatus.available_connectors} /{" "}
                    {liveStatus.total_connectors} connectors free
                  </p>
                  <p className="text-[10px] mt-0.5">
                    Last updated:{" "}
                    {new Date(liveStatus.last_updated).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="pt-1 mt-1 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-400">
            ⚪ Live Status Unavailable
          </p>
        </div>
      )}

      {/* Recommendation Breakdown */}
      {isRecommended && recommendation && (
        <div className="pt-2 mt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-slate-900">
              Why this stop?
            </p>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Score: {recommendation.recommended_score}/100
            </span>
          </div>
          <ul className="space-y-1 text-xs text-slate-700">
            {recommendation.recommendation_reason.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
            {recommendation.estimated_detour_km > 0 && (
              <li>✓ Detour: {recommendation.estimated_detour_km} km</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Renders EV charging stations as amber map markers with rich popups.
 *
 * Kept entirely separate from RouteLayer so the two concerns never bleed
 * into each other. This component knows nothing about routing — it only
 * needs a list of ChargingStation objects.
 */
export const ChargingLayer = memo(function ChargingLayer({
  stations,
  recommendation,
}: ChargingLayerProps) {
  if (stations.length === 0) {
    return null;
  }

  const recId = recommendation?.recommended_station?.id;

  const stationIcons = useMemo(() => {
    const iconMap = new Map<string, L.DivIcon>();
    for (const station of stations) {
      const isRecommended = station.id === recId;
      const maxPower = station.connectors.reduce(
        (max, c) => Math.max(max, c.power_kw || 0),
        0,
      );
      const isFastDc = maxPower >= 50;

      const icon = L.divIcon({
        className: "custom-station-pin",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
            ${
              isRecommended
                ? '<div style="position: absolute; inset: -2px; border-radius: 9999px; background: rgba(245, 158, 11, 0.45); animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>'
                : ""
            }
            <div style="
              position: relative;
              width: ${isRecommended ? "32px" : "26px"};
              height: ${isRecommended ? "32px" : "26px"};
              border-radius: 9999px;
              background: ${isRecommended ? "#d97706" : isFastDc ? "#059669" : "#0284c7"};
              border: 2px solid #ffffff;
              box-shadow: 0 3px 8px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: ${isRecommended ? "14px" : "12px"};
              font-weight: bold;
            ">
              ${isRecommended ? "⭐" : "⚡"}
            </div>
            ${
              isFastDc && !isRecommended
                ? `<div style="
                    position: absolute;
                    bottom: -4px;
                    background: #065f46;
                    color: #a7f3d0;
                    font-size: 8px;
                    font-weight: 800;
                    padding: 0 3px;
                    border-radius: 4px;
                    border: 1px solid rgba(255,255,255,0.4);
                    white-space: nowrap;
                  ">${Math.round(maxPower)}kW</div>`
                : ""
            }
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      iconMap.set(station.id, icon);
    }
    return iconMap;
  }, [stations, recId]);

  return (
    <>
      {stations.map((station) => {
        const isRecommended = station.id === recId;
        const maxPower = station.connectors.reduce(
          (max, c) => Math.max(max, c.power_kw || 0),
          0,
        );
        const isFastDc = maxPower >= 50;
        const stationIcon = stationIcons.get(station.id);

        if (!stationIcon) return null;

        return (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={stationIcon}
            zIndexOffset={isRecommended ? 1500 : isFastDc ? 1200 : 1000}
          >
            <Popup maxWidth={300} minWidth={240}>
              <ChargingStationPopup
                station={station}
                recommendation={recommendation}
                isRecommended={isRecommended}
              />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
});
