import logging
from urllib.parse import quote
import httpx

from app.schemas.place import Place
from app.schemas.route import RouteGeometry, ProviderMetadata
from app.services.routing.provider import RoutingProvider, RouteResult

logger = logging.getLogger(__name__)

class RoutingProviderError(Exception):
    pass

class OSRMProvider(RoutingProvider):
    def __init__(self) -> None:
        self._routing_base_url = "https://router.project-osrm.org/route/v1/driving"
        self._provider_meta = ProviderMetadata(name="OSRM Demo Server")

    async def compute_route(self, origin: Place, destination: Place) -> RouteResult:
        coordinates = (
            f"{origin.longitude},{origin.latitude};"
            f"{destination.longitude},{destination.latitude}"
        )
        encoded_coordinates = quote(coordinates, safe=",;")
        request_url = f"{self._routing_base_url}/{encoded_coordinates}"

        logger.debug(
            "[routing] stage=request_start provider=%r origin=[%f, %f] destination=[%f, %f] url=%s",
            self._provider_meta.name,
            origin.latitude, origin.longitude,
            destination.latitude, destination.longitude,
            request_url
        )

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response = await client.get(
                    request_url,
                    params={
                        "overview": "full",
                        "geometries": "geojson",
                        "steps": "false",
                    },
                )
                logger.debug("[routing] stage=request_complete status_code=%d", response.status_code)
                response.raise_for_status()
                payload = response.json()
            except httpx.HTTPError as e:
                logger.error("[routing] stage=request_failed error=%s", str(e))
                raise RoutingProviderError("OSRM routing request failed") from e

        if payload.get("code") != "Ok" or not payload.get("routes"):
            raise RoutingProviderError("No route found between the selected locations")

        route = payload["routes"][0]
        geometry = RouteGeometry(**route["geometry"])
        distance = route["distance"]
        duration = route["duration"]

        logger.debug(
            "[routing] stage=route_computed distance_m=%.1f duration_s=%.1f points=%d",
            distance,
            duration,
            len(geometry.coordinates)
        )

        return RouteResult(
            geometry=geometry,
            distance_meters=distance,
            duration_seconds=duration,
            provider=self._provider_meta
        )
