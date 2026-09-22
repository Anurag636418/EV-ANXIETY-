"use client";

import type { SimulationState } from "./TripSimulationLayer";

type SimulationControlsProps = {
  simState: SimulationState;
  onUpdateState: (partial: Partial<SimulationState>) => void;
  onClose: () => void;
};

export function SimulationControls({
  simState,
  onUpdateState,
  onClose,
}: SimulationControlsProps) {
  const socColor =
    simState.currentSoc > 35
      ? "bg-emerald-500"
      : simState.currentSoc > 15
        ? "bg-amber-500"
        : "bg-red-500";

  const socTextColor =
    simState.currentSoc > 35
      ? "text-emerald-400"
      : simState.currentSoc > 15
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-white/15 bg-slate-950/85 p-3.5 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 md:p-4">
      {/* Top Header Row: Status + Battery + Close */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                simState.isCharging ? "bg-emerald-400" : "bg-sky-400"
              } opacity-75`}
            ></span>
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                simState.isCharging ? "bg-emerald-500" : "bg-sky-500"
              }`}
            ></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-slate-300">
            {simState.isCharging ? (
              <>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-400"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>{" "}
                Charging Stop
              </>
            ) : (
              "EV Drive Simulation"
            )}
          </div>
        </div>

        {/* Battery SOC Pill Gauge */}
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 border border-white/10">
          {/* Battery Icon with Fill */}
          <div className="relative flex h-3.5 w-7 items-center rounded-sm border border-white/50 p-0.5">
            <div
              className={`h-full rounded-xs transition-all duration-300 ${socColor}`}
              style={{
                width: `${Math.max(5, Math.min(100, simState.currentSoc))}%`,
              }}
            ></div>
            <div className="absolute -right-1 h-1.5 w-0.5 rounded-r-xs bg-white/50"></div>
          </div>
          <span className={`text-xs font-extrabold ${socTextColor}`}>
            {simState.currentSoc}% SOC
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
          title="Exit simulation"
        >
          ✕
        </button>
      </div>

      {/* Dynamic Status Text */}
      <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
        <div className="truncate font-medium text-slate-200">
          {simState.statusText}
        </div>
        <div className="shrink-0 font-mono text-[11px] text-slate-400">
          {simState.coveredKm} / {simState.totalKm} km
        </div>
      </div>

      {/* Interactive Route Scrubber */}
      <div className="space-y-1 pt-1">
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={simState.progress}
          onChange={(e) =>
            onUpdateState({
              progress: parseFloat(e.target.value),
              isPlaying: false,
            })
          }
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-sky-400 hover:accent-sky-300"
        />
      </div>

      {/* Playback Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Play/Pause & Reset */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (simState.progress >= 1.0) {
                onUpdateState({ progress: 0, isPlaying: true });
              } else {
                onUpdateState({ isPlaying: !simState.isPlaying });
              }
            }}
            className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md transition hover:bg-sky-400 active:scale-95"
          >
            {simState.isPlaying
              ? "⏸ Pause"
              : simState.progress >= 1.0
                ? "↺ Restart"
                : "▶ Play"}
          </button>

          <button
            onClick={() => onUpdateState({ progress: 0, isPlaying: false })}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-xs text-slate-300 transition hover:bg-white/20 hover:text-white"
            title="Reset to origin"
          >
            ↺
          </button>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
          <span className="text-[10px] text-slate-400 font-medium ml-1 mr-0.5">
            Speed
          </span>
          {[1, 5, 20, 50].map((spd) => (
            <button
              key={spd}
              onClick={() => onUpdateState({ speedMultiplier: spd })}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                simState.speedMultiplier === spd
                  ? "bg-white/25 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Follow Camera Switch */}
        <button
          onClick={() => onUpdateState({ followCar: !simState.followCar })}
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
            simState.followCar
              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
              : "bg-white/10 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle camera auto-follow"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          <span>{simState.followCar ? "Following" : "Free Cam"}</span>
        </button>
      </div>
    </div>
  );
}
