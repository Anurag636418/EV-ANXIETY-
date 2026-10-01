import { useMemo } from "react";
import type { TripPlanResponse } from "@/lib/types";
import { formatDistance, formatDuration } from "@/lib/formatRoute";

type TripSummaryPanelProps = {
  tripPlan: TripPlanResponse;
  showAllStations: boolean;
  onToggleStations: () => void;
  onStartSimulation?: () => void;
  isSimulating?: boolean;
  onFocusStation?: (station: any) => void;
};

export function TripSummaryPanel({
  tripPlan,
  showAllStations,
  onToggleStations,
  onStartSimulation,
  isSimulating,
  onFocusStation,
}: TripSummaryPanelProps) {
  const { route, summary, itinerary } = tripPlan;

  const distanceText = formatDistance(summary.distance_meters);
  const durationText = formatDuration(summary.duration_seconds);

  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Trip Summary
            </h2>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-emerald-600">●</span>
              <span className="text-base font-semibold text-slate-900 truncate">
                {route.origin.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">■</span>
              <span className="text-base font-semibold text-slate-900 truncate">
                {route.destination.label}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="text-xl font-bold text-slate-800">
                {distanceText}
              </div>
              <div className="text-slate-500 font-medium">{durationText}</div>
            </div>

            {onStartSimulation && (
              <button
                onClick={onStartSimulation}
                className="w-full mt-3.5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
                <span>
                  {isSimulating ? "Simulation Active" : "Simulate Drive"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Show alternative stations toggle */}
        <button
          onClick={onToggleStations}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {showAllStations ? (
              <>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </>
            )}
          </svg>
          {showAllStations
            ? "Hide alternative stations"
            : "Show alternative stations"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ABRP Header */}
      <div className="border-b border-slate-200 pb-4 mb-2">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Route Plan</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-slate-800">
              {durationText}
            </span>
            <span className="text-sm font-medium text-slate-500">
              {distanceText}
            </span>
          </div>
          <div className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {summary.charging_stations_found} Stops
          </div>
        </div>

        {onStartSimulation && (
          <button
            onClick={onStartSimulation}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
            </svg>
            <span>
              {isSimulating ? "Simulation Active" : "Simulate EV Drive"}
            </span>
          </button>
        )}
      </div>

      {/* ABRP Timeline */}
      <div className="py-2">
        {itinerary.map((segment, index) => {
          if (segment.segment_type === "DRIVE") {
            const isLast = index === itinerary.length - 1;
            const hasNegativeArrival = segment.end_soc_percent < 0;
            return (
              <div key={`drive-${index}`} className="relative flex">
                <div className="flex flex-col items-center mr-4 w-6">
                  {/* Origin Node */}
                  <div
                    className={`w-3.5 h-3.5 rounded-full z-10 ${index === 0 ? "bg-blue-600 ring-4 ring-blue-100" : "bg-slate-300"}`}
                  ></div>

                  {/* Driving Line */}
                  <div
                    className={`w-0.5 h-full my-1 ${hasNegativeArrival ? "bg-red-200 border-l border-r border-dashed border-red-400" : "bg-blue-200"}`}
                  ></div>
                </div>

                <div className="flex-1 pb-6 pt-0.5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-base font-bold text-slate-900">
                      {segment.origin_name}
                    </div>
                    <div className="bg-slate-200 text-slate-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1.5">
                      <svg
                        className="text-emerald-600"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          width="16"
                          height="10"
                          x="2"
                          y="7"
                          rx="2"
                          ry="2"
                        />
                        <line x1="22" x2="22" y1="11" y2="13" />
                      </svg>
                      {Math.max(0, segment.start_soc_percent)}%
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-3 mb-1">
                    <span>{formatDistance(segment.distance_meters)}</span>
                    <span>•</span>
                    <span>
                      {formatDuration(segment.duration_seconds)} drive
                    </span>
                  </div>

                  {isLast && (
                    <div className="mt-6 relative">
                      {/* Fake connecting line to final destination dot */}
                      <div className="absolute -left-[1.4rem] top-2 w-3.5 h-3.5 rounded-full bg-red-600 ring-4 ring-red-100 z-10 -ml-[1px]"></div>
                      <div className="flex items-start justify-between">
                        <div className="text-base font-bold text-slate-900">
                          {segment.destination_name}
                        </div>
                        <div
                          className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1.5 ${hasNegativeArrival ? "bg-red-600 text-white" : "bg-slate-200 text-slate-800"}`}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                            <line x1="4" x2="4" y1="22" y2="15" />
                          </svg>
                          {hasNegativeArrival
                            ? "Unreachable"
                            : `${segment.end_soc_percent}%`}
                        </div>
                      </div>
                      {hasNegativeArrival && (
                        <div className="text-xs text-red-600 mt-1 font-semibold">
                          You need to charge to reach this destination.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (segment.segment_type === "CHARGE") {
            const station = segment.station;
            const hasNegativeArrival = segment.start_soc_percent < 0;
            return (
              <div key={`charge-${index}`} className="relative flex">
                <div className="flex flex-col items-center mr-4 w-6">
                  {/* Charging Node */}
                  <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center text-white z-10 shadow-sm">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                  <div className="w-0.5 h-full my-1 bg-emerald-200"></div>
                </div>

                <div className="flex-1 pb-6 pt-0.5">
                  <div
                    onClick={() => onFocusStation?.(station)}
                    className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer rounded-lg p-3 shadow-sm relative overflow-hidden group"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:w-1.5 transition-all"></div>

                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {station.provider_metadata?.provider || station.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">
                          {station.address || station.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-700">
                          {formatDuration(segment.duration_seconds)}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">
                          Charging
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {station.connectors.map((c: any, i: number) => (
                        <span
                          key={i}
                          className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200/60"
                        >
                          {c.type_name} {c.power_kw ? `${c.power_kw}kW` : ""}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold px-2 py-1 rounded-md ${hasNegativeArrival ? "bg-red-100 text-red-700" : "text-slate-700 bg-slate-100"}`}
                        >
                          {hasNegativeArrival
                            ? "0%"
                            : `${segment.start_soc_percent}%`}
                        </span>
                        <svg
                          className="text-slate-400"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                        <span className="text-sm font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md">
                          {segment.end_soc_percent}%
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-600">
                        ₹{segment.estimated_cost_inr}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Show alternative stations toggle */}
      <div className="pt-3 mt-2 border-t border-slate-100">
        <button
          onClick={onToggleStations}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {showAllStations ? (
              <>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </>
            )}
          </svg>
          {showAllStations
            ? "Hide alternative stations"
            : "Show alternative stations"}
        </button>
      </div>
    </div>
  );
}
