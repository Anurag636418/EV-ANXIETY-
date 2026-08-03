"use client";

import { useBackendHealth } from "@/lib/useBackendHealth";

export function BackendStatus() {
  const { error, isConnected, isLoading } = useBackendHealth();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
        Checking Backend...
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Backend Connected
      </div>
    );
  }

  return (
    <div className="max-w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      Backend connection failed: {error}
    </div>
  );
}
