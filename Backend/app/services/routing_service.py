from app.schemas.place import Place
from app.schemas.route import RoutePoint, RouteResponse
from app.services.routing.provider import RoutingProvider
from app.services.routing.osrm_provider import OSRMProvider, RoutingProviderError

class RoutePlanningError(Exception):
    pass

class RoutingService:
    def __init__(self, provider: RoutingProvider | None = None) -> None:
        self._provider = provider or OSRMProvider()

    async def plan_route(self, origin: Place, destination: Place) -> RouteResponse:
        try:
            result = await self._provider.compute_route(origin, destination)
        except RoutingProviderError as e:
            raise RoutePlanningError(str(e)) from e

        return RouteResponse(
            origin=RoutePoint(
                label=origin.display_name,
                latitude=origin.latitude,
                longitude=origin.longitude
            ),
            destination=RoutePoint(
                label=destination.display_name,
                latitude=destination.latitude,
                longitude=destination.longitude
            ),
            geometry=result.geometry,
            distance_meters=result.distance_meters,
            duration_seconds=result.duration_seconds,
            provider=result.provider
        )
