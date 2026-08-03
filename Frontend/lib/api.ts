import type { RouteRequest, RouteResponse } from "@/lib/types";

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
      errorPayload?.detail ?? `Route planning failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<RouteResponse>;
}
