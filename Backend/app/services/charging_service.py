import logging
from app.core.config import settings
from app.schemas.charging import ChargingResponse
from app.services.charging.strategy import ChargingSearchStrategy, ChargingDiscoveryError
from app.services.charging.adaptive_waypoint_strategy import AdaptiveWaypointStrategy
from app.services.charging.aggregator import ChargingAggregator

logger = logging.getLogger(__name__)

class ChargingService:
    """
    Discovers EV charging stations along a route.
    Delegates to ChargingAggregator to manage multiple providers.
    """

    def __init__(self, strategy: ChargingSearchStrategy | None = None):
        self._strategy = strategy or AdaptiveWaypointStrategy(
            interval_km=20.0,
            max_waypoints=settings.charging_max_waypoints
        )
        self._aggregator = ChargingAggregator()

    async def find_stations_along_route(
        self,
        coordinates: list[list[float]],
        radius_km: float,
    ) -> ChargingResponse:
        logger.debug(
            "[charging] stage=coordinates_received "
            "total_coords=%d radius_km=%s strategy=%s",
            len(coordinates),
            radius_km,
            self._strategy.__class__.__name__
        )

        try:
            waypoints = self._strategy.generate_waypoints(coordinates)
            logger.debug(f"[charging] Generated {len(waypoints)} waypoints.")
            
            response = await self._aggregator.find_stations(
                waypoints=waypoints,
                radius_km=radius_km,
                route_coordinates=coordinates
            )
            
        except Exception as e:
            logger.error("[charging] stage=pipeline_failed error=%s", str(e))
            raise ChargingDiscoveryError(f"Charging discovery pipeline failed: {e}") from e

        logger.debug(
            "[charging] stage=response_ready total_found=%d merged=%d api_calls=%d "
            "api_latency_ms=%.1f total_time_ms=%.1f duplicates=%d errors=%d",
            response.summary.total_found,
            response.summary.merged_station_count,
            response.summary.api_calls,
            response.summary.api_latency_ms,
            response.summary.total_discovery_time_ms,
            response.summary.duplicates_removed,
            response.summary.provider_errors
        )

        return response
