"use client";

import { FormEvent } from "react";
import { PlaceSearch } from "./PlaceSearch";
import { VehicleSelector } from "./VehicleSelector";
import type { Place, VehicleInput } from "@/lib/types";

export type TripDraft = {
  origin: Place | null;
  destination: Place | null;
  vehicle?: VehicleInput;
};

type TripControlsProps = {
  error: string | null;
  isLoading: boolean;
  tripDraft: TripDraft;
  hasExistingPlan?: boolean;
  onCancelEdit?: () => void;
  onDraftChange: (draft: TripDraft) => void;
  onPlanTrip: (tripDraft: {
    origin: Place;
    destination: Place;
    vehicle?: VehicleInput;
  }) => Promise<void>;
};

export function TripControls({
  error,
  isLoading,
  tripDraft,
  hasExistingPlan,
  onCancelEdit,
  onDraftChange,
  onPlanTrip,
}: TripControlsProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tripDraft.origin || !tripDraft.destination) {
      return;
    }

    await onPlanTrip({
      origin: tripDraft.origin,
      destination: tripDraft.destination,
      vehicle: tripDraft.vehicle,
    });
  };

  const isFormIncomplete = !tripDraft.origin || !tripDraft.destination;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Plan a Trip</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Search your origin and destination.
          </p>
        </div>
        {hasExistingPlan && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition"
          >
            View Route →
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        <PlaceSearch
          label="Origin"
          name="origin"
          placeholder="Search starting location..."
          selectedPlace={tripDraft.origin}
          onPlaceSelect={(place) =>
            onDraftChange({ ...tripDraft, origin: place })
          }
        />

        <div className="flex justify-center -my-1">
          <button
            type="button"
            onClick={() =>
              onDraftChange({
                ...tripDraft,
                origin: tripDraft.destination,
                destination: tripDraft.origin,
              })
            }
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-3 py-1 rounded-full border border-slate-200 hover:border-emerald-200 transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Swap origin and destination"
            disabled={!tripDraft.origin && !tripDraft.destination}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>Swap Locations</span>
          </button>
        </div>

        <PlaceSearch
          label="Destination"
          name="destination"
          placeholder="Search destination..."
          selectedPlace={tripDraft.destination}
          onPlaceSelect={(place) =>
            onDraftChange({ ...tripDraft, destination: place })
          }
        />

        <VehicleSelector
          value={tripDraft.vehicle}
          onChange={(v) => onDraftChange({ ...tripDraft, vehicle: v })}
        />
      </div>

      <button
        className="h-11 w-full rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm active:scale-[0.99]"
        disabled={isLoading || isFormIncomplete}
        type="submit"
      >
        {isLoading ? "Planning..." : "Plan Trip"}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
        >
          {error}
        </div>
      )}
    </form>
  );
}
