"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useCallback } from "react";
import { TripSummaryPanel } from "@/components/TripSummaryPanel";
import { TripControls, type TripDraft } from "@/components/TripControls";
import { SimulationControls } from "@/components/SimulationControls";
import { EmergencyPanel } from "@/components/EmergencyPanel";
import type { SimulationState } from "@/components/TripSimulationLayer";
import { planTrip } from "@/lib/api";
import type {
  ChargingStation,
  TripPlanResponse,
  Place,
  VehicleInput,
} from "@/lib/types";

const EvMap = dynamic(
  () => import("@/components/EvMap").then((module) => module.EvMap),
  {
    loading: () => (
      <div className="flex h-full min-h-screen items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">
        Loading map...
      </div>
    ),
    ssr: false,
  },
);

export function TripPlannerShell() {
  const [tripPlan, setTripPlan] = useState<TripPlanResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isPlanningRoute, setIsPlanningRoute] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAllStations, setShowAllStations] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [focusedStation, setFocusedStation] = useState<ChargingStation | null>(
    null,
  );
  const [panelState, setPanelState] = useState<"full" | "peek" | "minimized">(
    "full",
  );

  const [simState, setSimState] = useState<SimulationState>({
    isPlaying: false,
    progress: 0,
    speedMultiplier: 5,
    followCar: true,
    currentSoc: 100,
    coveredKm: 0,
    totalKm: 0,
    statusText: "Ready to simulate",
    isCharging: false,
  });

  const handleUpdateSimState = useCallback(
    (partial: Partial<SimulationState>) => {
      setSimState((prev) => {
        let hasChange = false;
        for (const k in partial) {
          const key = k as keyof SimulationState;
          if (prev[key] !== partial[key]) {
            hasChange = true;
            break;
          }
        }
        return hasChange ? { ...prev, ...partial } : prev;
      });
    },
    [],
  );

  const handleStartSimulation = useCallback(() => {
    setIsSimulating(true);
    setSimState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const handleCloseSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimState((prev) => ({ ...prev, isPlaying: false, progress: 0 }));
  }, []);

  const [tripDraft, setTripDraft] = useState<TripDraft>({
    origin: null,
    destination: null,
  });

  const route = tripPlan?.route ?? null;
  const stations: ChargingStation[] = tripPlan?.charging.stations ?? [];
  const recommendation = tripPlan?.recommendation ?? null;

  // Compute visible stations
  const visibleStations = useMemo(() => {
    if (showAllStations || stations.length === 0) return stations;
    if (recommendation?.recommended_station) {
      return [recommendation.recommended_station];
    }
    return stations.slice(0, 5); // Fallback: show max 5
  }, [stations, recommendation, showAllStations]);

  const handlePlanTrip = async (draft: {
    origin: Place;
    destination: Place;
    vehicle?: VehicleInput;
  }) => {
    if (!draft.origin || !draft.destination) {
      setRouteError("Enter both origin and destination.");
      return;
    }

    setIsPlanningRoute(true);
    setRouteError(null);
    setIsSimulating(false);
    setIsEditing(false);
    setShowAllStations(!draft.vehicle);

    try {
      const plan = await planTrip({
        origin: draft.origin,
        destination: draft.destination,
        vehicle: draft.vehicle,
      });
      setTripPlan(plan);
      setPanelState("peek");
    } catch (error) {
      setTripPlan(null);
      setRouteError(
        error instanceof Error ? error.message : "Unable to plan trip.",
      );
    } finally {
      setIsPlanningRoute(false);
    }
  };

  const showTripForm = !tripPlan || isEditing;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-100 text-slate-950">
      {/* Background Map filling entire screen */}
      <div className="absolute inset-0 z-0">
        <EvMap
          route={route}
          stations={visibleStations}
          recommendation={recommendation}
          previewOrigin={tripDraft.origin}
          previewDestination={tripDraft.destination}
          itinerary={tripPlan?.itinerary}
          isSimulating={isSimulating}
          simState={simState}
          onUpdateSimState={handleUpdateSimState}
          focusedStation={focusedStation}
        />
      </div>

      {/* Floating Simulation HUD Overlay */}
      {isSimulating && (
        <div className="pointer-events-none absolute top-4 left-4 right-4 md:left-auto md:right-6 md:top-6 md:w-[450px] z-30 animate-in fade-in slide-in-from-top-3 duration-300">
          <SimulationControls
            simState={simState}
            onUpdateState={handleUpdateSimState}
            onClose={handleCloseSimulation}
          />
        </div>
      )}

      {/* Floating UI overlay */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none md:p-4">
        {/* Unified Header & Panel on Desktop */}
        <div className="flex flex-col md:rounded-2xl md:shadow-xl md:w-[420px] bg-white md:overflow-hidden mt-auto md:mt-0 pointer-events-auto transition-all duration-300">
          {/* Header with clean EV branding */}
          <header className="flex items-center justify-between bg-white/95 backdrop-blur px-4 py-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
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
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  EV Route Planner
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Smart routing & charging
                </p>
              </div>
            </div>
          </header>

          {/* Side Panel / Bottom Sheet */}
          <div
            className={`flex flex-col w-full transition-all duration-300 bg-white ${
              panelState === "minimized"
                ? "h-0 md:h-auto"
                : panelState === "peek"
                  ? "h-[35vh] md:h-auto"
                  : "h-[55vh] md:h-auto md:max-h-[calc(100vh-6.5rem)]"
            } overflow-hidden`}
          >
            {/* Mobile Drag / Collapse Handle */}
            <div
              onClick={() => {
                if (panelState === "full") setPanelState("peek");
                else if (panelState === "peek") setPanelState("minimized");
                else setPanelState("full");
              }}
              className="md:hidden flex flex-col items-center justify-center py-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border-b border-slate-100 select-none shrink-0"
              role="button"
              aria-label="Toggle panel"
            >
              <div className="w-10 h-1 rounded-full bg-slate-300" />
              <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                {panelState === "full"
                  ? "Swipe down to peek"
                  : panelState === "peek"
                    ? "Swipe down to minimize"
                    : "Tap to expand"}
              </span>
            </div>

            <div className="overflow-y-auto p-4 md:p-5 flex-1">
              {/* Show controls when planning initial trip or editing draft */}
              {showTripForm && !isPlanningRoute && (
                <div className="animate-in fade-in duration-300">
                  <TripControls
                    error={routeError}
                    isLoading={isPlanningRoute}
                    tripDraft={tripDraft}
                    hasExistingPlan={Boolean(tripPlan)}
                    onCancelEdit={() => setIsEditing(false)}
                    onDraftChange={setTripDraft}
                    onPlanTrip={handlePlanTrip}
                  />
                </div>
              )}

              {isPlanningRoute && (
                <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-in fade-in duration-300 py-10">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Planning your EV trip...
                    </h3>
                    <p className="text-sm text-slate-500 animate-pulse">
                      Finding the best route and charging stops
                    </p>
                  </div>

                  <div className="w-full max-w-[280px] space-y-3 mt-4">
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div>
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-5/6 mx-auto [animation-delay:150ms]"></div>
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-4/6 mx-auto [animation-delay:300ms]"></div>
                  </div>
                </div>
              )}

              {tripPlan && !isPlanningRoute && !isEditing && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setIsSimulating(false);
                      setFocusedStation(null);
                    }}
                    className="text-sm font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    Edit Trip Parameters
                  </button>
                  <TripSummaryPanel
                    tripPlan={tripPlan}
                    showAllStations={showAllStations}
                    onToggleStations={() =>
                      setShowAllStations(!showAllStations)
                    }
                    onStartSimulation={handleStartSimulation}
                    isSimulating={isSimulating}
                    onFocusStation={setFocusedStation}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Global Emergency Assistance SOS Button & Panel */}
      <EmergencyPanel selectedVehicleId={tripDraft.vehicle?.vehicle_id} />
    </main>
  );
}
