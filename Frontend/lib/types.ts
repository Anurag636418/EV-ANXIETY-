export type RouteGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export type RoutePoint = {
  label: string;
  latitude: number;
  longitude: number;
};

export type RouteRequest = {
  origin: string;
  destination: string;
};

export type RouteResponse = {
  origin: RoutePoint;
  destination: RoutePoint;
  geometry: RouteGeometry;
  distance_meters: number;
  duration_seconds: number;
};
