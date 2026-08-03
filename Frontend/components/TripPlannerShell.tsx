"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { BackendStatus } from "@/components/BackendStatus";
import { RouteSummary } from "@/components/RouteSummary";
import { TripControls } from "@/components/TripControls";
import { planRoute } from "@/lib/api";
import type { RouteRequest, RouteResponse } from "@/lib/types";

const EvMap = dynamic(
  () => import("@/components/EvMap").then((module) => module.EvMap),
  {
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">
        Loading map...
      </div>
    ),
    ssr: false,
  },
);

export function TripPlannerShell() {
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isPlanningRoute, setIsPlanningRoute] = useState(false);

  const handlePlanTrip = async (routeRequest: RouteRequest) => {
    if (!routeRequest.origin || !routeRequest.destination) {
      setRouteError("Enter both origin and destination.");
      return;
    }

    setIsPlanningRoute(true);
    setRouteError(null);

    try {
      const plannedRoute = await planRoute(routeRequest);
      setRoute(plannedRoute);
    } catch (error) {
      setRoute(null);
      setRouteError(
        error instanceof Error ? error.message : "Unable to plan route.",
      );
    } finally {
      setIsPlanningRoute(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen flex-col">
        <header className="z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">
                EV Trip Planning
              </p>
              <h1 className="text-xl font-semibold text-slate-950 md:text-2xl">
                Intelligent EV Trip Planner
              </h1>
            </div>
            <BackendStatus />
          </div>
        </header>

        <section className="grid flex-1 grid-rows-[auto_1fr] md:grid-cols-[380px_1fr] md:grid-rows-1">
          <aside className="z-20 space-y-4 border-b border-slate-200 bg-white p-4 shadow-sm md:border-b-0 md:border-r md:p-5">
            <TripControls
              error={routeError}
              isLoading={isPlanningRoute}
              onPlanTrip={handlePlanTrip}
            />
            <RouteSummary route={route} />
          </aside>

          <div className="min-h-[calc(100vh-290px)] md:min-h-0">
            <EvMap route={route} />
          </div>
        </section>
      </div>
    </main>
  );
}
