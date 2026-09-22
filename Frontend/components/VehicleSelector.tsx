"use client";

import { useEffect, useState } from "react";
import { getVehicles } from "@/lib/api";
import type { EVVehicle, VehicleInput } from "@/lib/types";

type VehicleSelectorProps = {
  value?: VehicleInput;
  onChange: (value: VehicleInput | undefined) => void;
};

export function VehicleSelector({ value, onChange }: VehicleSelectorProps) {
  const [vehicles, setVehicles] = useState<EVVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for the UI before firing onChange
  const [selectedId, setSelectedId] = useState<string>(value?.vehicle_id ?? "");
  const [soc, setSoc] = useState<number>(value?.current_soc_percent ?? 80);

  // Synchronize state when value changes externally
  useEffect(() => {
    setSelectedId(value?.vehicle_id ?? "");
    setSoc(value?.current_soc_percent ?? 80);
  }, [value?.vehicle_id, value?.current_soc_percent]);

  useEffect(() => {
    async function loadVehicles() {
      setIsLoading(true);
      try {
        const data = await getVehicles();
        setVehicles(data);
      } catch (err) {
        setError("Failed to load vehicle list.");
      } finally {
        setIsLoading(false);
      }
    }
    loadVehicles();
  }, []);

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    updateParent(id, soc);
  };

  const handleSocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSoc = parseInt(e.target.value, 10);
    const validSoc = isNaN(newSoc) ? 0 : Math.min(100, Math.max(0, newSoc));
    setSoc(validSoc);
    updateParent(selectedId, validSoc);
  };

  const updateParent = (id: string, currentSoc: number) => {
    if (id) {
      onChange({
        vehicle_id: id,
        current_soc_percent: currentSoc,
      });
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className="space-y-3 pt-3 mt-1 border-t border-slate-100">
      <h3 className="text-sm font-semibold text-slate-900">
        Vehicle (Optional)
      </h3>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-700">
          EV Model
        </label>
        {isLoading ? (
          <div className="text-xs text-slate-500">Loading vehicles...</div>
        ) : error ? (
          <div className="text-xs text-red-500">{error}</div>
        ) : (
          <select
            className="block w-full rounded-md border-slate-300 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
            value={selectedId}
            onChange={handleVehicleChange}
            suppressHydrationWarning
          >
            <option value="">-- Do not estimate range --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} ({v.battery_capacity_kwh} kWh)
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedId && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-700">
            Current Battery (%)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={soc}
              onChange={handleSocChange}
              className="flex-1 accent-emerald-600"
              aria-label="Current battery percentage"
              aria-valuenow={soc}
              aria-valuemin={0}
              aria-valuemax={100}
            />
            <span className="w-12 text-right text-sm font-semibold text-emerald-700">
              {soc}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            {[20, 50, 80, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setSoc(preset);
                  updateParent(selectedId, preset);
                }}
                className={`flex-1 rounded py-1 text-[11px] font-semibold transition ${
                  soc === preset
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
