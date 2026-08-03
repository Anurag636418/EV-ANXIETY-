from urllib.parse import quote

import httpx

from app.schemas.route import RouteGeometry, RoutePoint, RouteResponse


class RoutePlanningError(Exception):
    pass


class RoutingService:
    def __init__(self) -> None:
        self._geocoding_base_url = "https://nominatim.openstreetmap.org/search"
        self._routing_base_url = "https://router.project-osrm.org/route/v1/driving"

    async def plan_route(self, origin: str, destination: str) -> RouteResponse:
        async with httpx.AsyncClient(timeout=20.0) as client:
            origin_point = await self._geocode(client, origin)
            destination_point = await self._geocode(client, destination)
            return await self._route(client, origin_point, destination_point)

    async def _geocode(self, client: httpx.AsyncClient, query: str) -> RoutePoint:
        response = await client.get(
            self._geocoding_base_url,
            params={
                "q": query,
                "format": "jsonv2",
                "limit": 1,
            },
            headers={
                "User-Agent": "intelligent-ev-trip-planner-development"
            },
        )
        response.raise_for_status()
        results = response.json()

        if not results:
            raise RoutePlanningError(f"Could not find location: {query}")

        first_result = results[0]

        return RoutePoint(
            label=first_result.get("display_name", query),
            latitude=float(first_result["lat"]),
            longitude=float(first_result["lon"]),
        )

    async def _route(
        self,
        client: httpx.AsyncClient,
        origin: RoutePoint,
        destination: RoutePoint,
    ) -> RouteResponse:
        coordinates = (
            f"{origin.longitude},{origin.latitude};"
            f"{destination.longitude},{destination.latitude}"
        )
        encoded_coordinates = quote(coordinates, safe=",;")

        response = await client.get(
            f"{self._routing_base_url}/{encoded_coordinates}",
            params={
                "overview": "full",
                "geometries": "geojson",
                "steps": "false",
            },
        )
        response.raise_for_status()
        payload = response.json()

        if payload.get("code") != "Ok" or not payload.get("routes"):
            raise RoutePlanningError("No route found between the selected locations")

        route = payload["routes"][0]

        return RouteResponse(
            origin=origin,
            destination=destination,
            geometry=RouteGeometry(**route["geometry"]),
            distance_meters=route["distance"],
            duration_seconds=route["duration"],
        )
