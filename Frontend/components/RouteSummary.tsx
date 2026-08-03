"use client";

import { formatDistance, formatDuration } from "@/lib/formatRoute";
import type { RouteResponse } from "@/lib/types";

type RouteSummaryProps = {
  route: RouteResponse | null;
};

export function RouteSummary({ route }: RouteSummaryProps) {
  if (!route) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-500">
        Route distance and estimated travel time will appear after planning.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">
          Trip Summary
        </p>
        <p className="mt-1 text-sm font-medium text-slate-800">
          {route.origin.label}
        </p>
        <p className="text-xs text-slate-500">to</p>
        <p className="text-sm font-medium text-slate-800">
          {route.destination.label}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs text-slate-500">Distance</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {formatDistance(route.distance_meters)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs text-slate-500">Travel Time</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {formatDuration(route.duration_seconds)}
          </p>
        </div>
      </div>
    </div>
  );
}
