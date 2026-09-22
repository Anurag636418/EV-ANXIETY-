import type {
  Place,
  RouteRequest,
  RouteResponse,
  TripPlanRequest,
  TripPlanResponse,
  ChargingAvailability,
  ChargingAvailabilityRequest,
  EVVehicle,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type HealthResponse = {
  status: string;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

export type PlaceSearchResponse = {
  results: Place[];
};

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(
    `${API_BASE_URL}/places/search?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Place search failed with status ${response.status}`);
  }

  const data = (await response.json()) as PlaceSearchResponse;
  return data.results;
}

export async function planRoute(
  routeRequest: RouteRequest,
): Promise<RouteResponse> {
  const response = await fetch(`${API_BASE_URL}/route`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(routeRequest),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;

    throw new Error(
      errorPayload?.detail ??
        `Route planning failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<RouteResponse>;
}

/**
 * Fetch real-time charging availability for a station.
 */
export async function fetchChargingAvailability(
  request: ChargingAvailabilityRequest,
): Promise<ChargingAvailability> {
  const res = await fetch(`${API_BASE_URL}/availability/fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    let errorMessage = "Unable to fetch live status";
    try {
      const errorData = await res.json();
      if (errorData.detail) errorMessage = errorData.detail;
    } catch {
      // Ignore
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

/**
 * Plan a complete EV trip (route + charging stations) via the orchestrated
 * TripPlanningService. This is the primary endpoint used by the frontend.
 *
 * The standalone planRoute() above is kept for direct use in tests or
 * future workflows that only need routing without charging.
 */
export async function planTrip(
  request: TripPlanRequest,
): Promise<TripPlanResponse> {
  const response = await fetch(`${API_BASE_URL}/trip/plan`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;

    throw new Error(
      errorPayload?.detail ??
        `Trip planning failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<TripPlanResponse>;
}

export async function getVehicles(): Promise<EVVehicle[]> {
  const response = await fetch(`${API_BASE_URL}/vehicles`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load vehicles with status ${response.status}`);
  }

  return response.json() as Promise<EVVehicle[]>;
}
