export type RouteGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export type RoutePoint = {
  label: string;
  latitude: number;
  longitude: number;
};

export type Place = {
  display_name: string;
  latitude: number;
  longitude: number;
  osm_id?: string | number | null;
  osm_type?: string | null;
  importance?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

export type RouteRequest = {
  origin: Place;
  destination: Place;
};

export type RouteResponse = {
  origin: RoutePoint;
  destination: RoutePoint;
  geometry: RouteGeometry;
  distance_meters: number;
  duration_seconds: number;
  provider: {
    name: string;
  };
};

// --- Charging (Sprint 3) ---

export type ConnectorInfo = {
  type_name: string;
  power_kw: number | null;
};

export type ChargingProviderMetadata = {
  provider: string;
  provider_version: string;
  provider_station_id: string;
  fetched_at: string;
  latency_ms: number;
  supports_live_availability: boolean;
  raw_source?: Record<string, unknown>;
};

export type ChargingStation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  operator: string | null;
  connectors: ConnectorInfo[];
  provider_metadata?: ChargingProviderMetadata;
};

export type ChargingSearchSummary = {
  radius_km: number;
  waypoints_searched: number;
  total_found: number;
};

export type ChargingResponse = {
  stations: ChargingStation[];
  summary: ChargingSearchSummary;
};

export type ChargingRecommendation = {
  recommended_station: ChargingStation | null;
  recommended_score: number;
  recommendation_reason: string[];
  estimated_detour_km: number;
  alternative_stations: ChargingStation[];
};

export type AvailabilityStatus =
  "Available" | "Occupied" | "Unknown" | "Out of Service";

export type ChargingAvailability = {
  provider: string;
  provider_station_id: string;
  status: AvailabilityStatus;
  available_connectors: number;
  occupied_connectors: number;
  total_connectors: number;
  last_updated: string;
  supports_live_status: boolean;
  provider_metadata: Record<string, unknown>;
};

export type ChargingAvailabilityRequest = {
  station_id: string;
  provider_metadata: ChargingProviderMetadata;
};

// --- Trip Planning (Sprint 3/4/5) ---

export type TripPlanRequest = {
  origin: Place;
  destination: Place;
  charging_radius_km?: number;
  vehicle?: VehicleInput;
};

export type TripSummary = {
  distance_meters: number;
  duration_seconds: number;
  charging_stations_found: number;
};

export type DriveSegment = {
  segment_type: "DRIVE";
  origin_name: string;
  destination_name: string;
  distance_meters: number;
  duration_seconds: number;
  start_soc_percent: number;
  end_soc_percent: number;
  energy_used_kwh: number;
  route: RouteResponse;
};

export type ChargeSegment = {
  segment_type: "CHARGE";
  station: ChargingStation;
  start_soc_percent: number;
  end_soc_percent: number;
  energy_added_kwh: number;
  duration_seconds: number;
  estimated_cost_inr: number;
};

export type ItinerarySegment = DriveSegment | ChargeSegment;

export type TripPlanResponse = {
  route: RouteResponse;
  charging: ChargingResponse;
  range_estimate?: RangeEstimate | null;
  recommendation: ChargingRecommendation | null;
  summary: TripSummary;
  itinerary?: ItinerarySegment[];
};

export type EVVehicle = {
  id: string;
  make: string;
  model: string;
  variant?: string | null;
  battery_capacity_kwh: number;
  efficiency_kwh_per_100km: number;
  connector_types: string[];
  source_reference?: string | null;
};

export type VehicleInput = {
  vehicle_id?: string;
  battery_capacity_kwh?: number;
  current_soc_percent: number;
  efficiency_kwh_per_100km?: number;
};

export type RangeEstimate = {
  estimated_range_km: number;
  estimated_consumption_kwh: number;
  estimated_arrival_soc_percent: number;
  energy_shortfall_kwh: number;
  can_reach_destination: boolean;
  charging_stops_needed: number;
  estimated_cost_inr: number;
  cost_rate_per_kwh: number;
  disclaimer: string;
  trip_feasible_with_charging?: string | null;
};
