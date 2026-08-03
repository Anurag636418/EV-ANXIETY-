"use client";

import { FormEvent, useState } from "react";

type TripDraft = {
  origin: string;
  destination: string;
};

type TripControlsProps = {
  error: string | null;
  isLoading: boolean;
  onPlanTrip: (tripDraft: TripDraft) => Promise<void>;
};

export function TripControls({
  error,
  isLoading,
  onPlanTrip,
}: TripControlsProps) {
  const [tripDraft, setTripDraft] = useState<TripDraft>({
    origin: "",
    destination: "",
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onPlanTrip({
      origin: tripDraft.origin.trim(),
      destination: tripDraft.destination.trim(),
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Plan a Trip</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Enter your start and end points. Routing comes in the next milestone.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Origin</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            name="origin"
            onChange={(event) =>
              setTripDraft((current) => ({
                ...current,
                origin: event.target.value,
              }))
            }
            placeholder="Current location or city"
            type="text"
            value={tripDraft.origin}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Destination
          </span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            name="destination"
            onChange={(event) =>
              setTripDraft((current) => ({
                ...current,
                destination: event.target.value,
              }))
            }
            placeholder="Destination city or address"
            type="text"
            value={tripDraft.destination}
          />
        </label>
      </div>

      <button
        className="h-11 w-full rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? "Planning..." : "Plan Trip"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          {error}
        </div>
      )}
    </form>
  );
}
