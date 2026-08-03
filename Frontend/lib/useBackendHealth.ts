"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";

type BackendHealthState = {
  error: string | null;
  isConnected: boolean;
  isLoading: boolean;
};

export function useBackendHealth(): BackendHealthState {
  const [state, setState] = useState<BackendHealthState>({
    error: null,
    isConnected: false,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    async function checkBackendHealth() {
      try {
        const health = await getHealth();

        if (!isMounted) {
          return;
        }

        if (health.status !== "ok") {
          throw new Error("Backend returned an unhealthy status");
        }

        setState({
          error: null,
          isConnected: true,
          isLoading: false,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          error:
            error instanceof Error
              ? error.message
              : "Unable to connect to backend",
          isConnected: false,
          isLoading: false,
        });
      }
    }

    checkBackendHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
