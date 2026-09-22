import asyncio
import time
import logging
from typing import List

from app.core.config import settings
from app.schemas.charging import ChargingResponse, ChargingSearchSummary, ChargingStation
from app.services.charging.provider.base import ChargingProvider
from app.services.charging.provider.tomtom_provider import TomTomChargingProvider
from app.services.charging.provider.openchargemap_provider import OpenChargeMapProvider
from app.services.charging.deduplication_service import DeduplicationService
from app.services.charging.ranker import ChargingStationRanker

logger = logging.getLogger(__name__)

class ChargingAggregator:
    """
    Coordinates multiple ChargingProviders, merges their results, and processes them
    through the deduplication and ranking pipeline.
    """
    
    def __init__(self):
        self.providers: List[ChargingProvider] = []
        self.fallback_provider: ChargingProvider | None = None
        provider_config = settings.charging_provider.lower()
        
        if provider_config == "tomtom":
            self.providers.append(TomTomChargingProvider())
            self.fallback_provider = OpenChargeMapProvider()
        elif provider_config == "openchargemap":
            self.providers.append(OpenChargeMapProvider())
        elif provider_config == "both":
            self.providers.append(TomTomChargingProvider())
            self.providers.append(OpenChargeMapProvider())
        else:
            logger.warning(f"[aggregator] Unknown CHARGING_PROVIDER '{provider_config}', defaulting to TomTom.")
            self.providers.append(TomTomChargingProvider())
            self.fallback_provider = OpenChargeMapProvider()
            
        self.dedup_service = DeduplicationService()
        self.ranker = ChargingStationRanker()

    async def find_stations(
        self,
        waypoints: List[List[float]],
        radius_km: float,
        route_coordinates: List[List[float]]
    ) -> ChargingResponse:
        
        start_time = time.time()
        
        # 1. Call active providers concurrently
        tasks = [p.search_along_route(waypoints, radius_km) for p in self.providers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_stations: List[ChargingStation] = []
        total_api_calls = 0
        total_provider_errors = 0
        max_api_latency = 0.0
        
        for idx, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"[aggregator] Provider {self.providers[idx].__class__.__name__} failed catastrophically: {result}")
                total_provider_errors += 1
                continue
                
            stations, telemetry = result
            all_stations.extend(stations)
            
            total_api_calls += telemetry.get("api_calls", 0)
            total_provider_errors += telemetry.get("provider_errors", 0)
            
            latency = telemetry.get("latency_ms", 0.0)
            if latency > max_api_latency:
                max_api_latency = latency

        # Automatic fallback if primary returned 0 stations and fallback is configured
        if not all_stations and self.fallback_provider:
            logger.warning("[aggregator] Primary provider returned 0 stations. Triggering fallback provider...")
            try:
                fallback_stations, fb_telemetry = await self.fallback_provider.search_along_route(waypoints, radius_km)
                all_stations.extend(fallback_stations)
                total_api_calls += fb_telemetry.get("api_calls", 0)
                total_provider_errors += fb_telemetry.get("provider_errors", 0)
            except Exception as fb_err:
                logger.error(f"[aggregator] Fallback provider also failed: {fb_err}")
                total_provider_errors += 1

        pre_dedup_count = len(all_stations)

        # 2. Deduplicate
        unique_stations = self.dedup_service.deduplicate(all_stations)
        duplicates_removed = pre_dedup_count - len(unique_stations)

        # 3. Rank
        ranked_stations = self.ranker.rank(unique_stations, route_coordinates)
        
        total_discovery_time_ms = (time.time() - start_time) * 1000

        summary = ChargingSearchSummary(
            radius_km=radius_km,
            waypoints_searched=len(waypoints),
            waypoints_generated=len(waypoints),
            total_found=pre_dedup_count,
            api_calls=total_api_calls,
            api_latency_ms=max_api_latency,
            duplicates_removed=duplicates_removed,
            merged_station_count=len(ranked_stations),
            provider_errors=total_provider_errors,
            total_discovery_time_ms=total_discovery_time_ms
        )

        return ChargingResponse(
            stations=ranked_stations,
            summary=summary
        )
