import time
import httpx
from typing import Any
import logging
from datetime import datetime, timezone

from app.schemas.charging import ChargingStation, ConnectorInfo, ChargingProviderMetadata
from app.services.charging.provider.base import ChargingProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

import asyncio

class TomTomChargingProvider(ChargingProvider):
    """
    TomTom implementation of the ChargingProvider interface.
    Uses TomTom EV Search API.
    """
    
    _BASE_URL = "https://api.tomtom.com/search/2/nearbySearch/.json"
    _PROVIDER_NAME = "TomTom"
    _PROVIDER_VERSION = "SearchAPI-v2"

    async def search_along_route(
        self,
        waypoints: list[list[float]],
        radius_km: float
    ) -> tuple[list[ChargingStation], dict[str, Any]]:
        
        stations: list[ChargingStation] = []
        seen_ids = set()
        
        api_calls = 0
        total_latency = 0.0
        provider_errors = 0
        
        if not settings.tom_tom_api_key:
            logger.warning("[tomtom_provider] Missing TOM_TOM_API_KEY. Returning empty results.")
            return stations, {"api_calls": 0, "latency_ms": 0.0, "provider_errors": 1}
            
        async def fetch_waypoint(client: httpx.AsyncClient, lon: float, lat: float):
            radius_m = min(int(radius_km * 1000), 50000)
            params = {
                "key": settings.tom_tom_api_key,
                "lat": lat,
                "lon": lon,
                "radius": radius_m,
                "categorySet": 7309,
                "view": "IN",
                "limit": 100
            }
            req_start = time.time()
            try:
                response = await client.get(self._BASE_URL, params=params)
                response.raise_for_status()
                data = response.json()
                req_latency_ms = (time.time() - req_start) * 1000
                return data, req_latency_ms, None
            except Exception as e:
                return None, 0.0, e
        
        # We limit concurrency for TomTom slightly because of their strict rate limits (usually 5 QPS on free tier).
        # We can use a semaphore to limit simultaneous requests to 5.
        semaphore = asyncio.Semaphore(5)
        
        async def fetch_with_semaphore(client, lon, lat):
            async with semaphore:
                return await fetch_waypoint(client, lon, lat)
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = [fetch_with_semaphore(client, lon, lat) for lon, lat in waypoints]
            results = await asyncio.gather(*tasks)
            
            for data, latency, error in results:
                if error:
                    provider_errors += 1
                    continue
                    
                api_calls += 1
                total_latency += latency
                
                results_list = data.get("results", [])
                for raw in results_list:
                    station_id = raw.get("id")
                    if not station_id or station_id in seen_ids:
                        continue
                            
                    seen_ids.add(station_id)
                    station = self._parse_station(raw, latency)
                    if station:
                        stations.append(station)
                    
        telemetry = {
            "api_calls": api_calls,
            "latency_ms": total_latency,
            "provider_errors": provider_errors
        }
        return stations, telemetry

    def _parse_station(self, raw: dict, latency_ms: float) -> ChargingStation | None:
        poi = raw.get("poi", {})
        address_info = raw.get("address", {})
        pos = raw.get("position", {})
        
        lat = pos.get("lat")
        lon = pos.get("lon")
        
        if lat is None or lon is None:
            return None
            
        name = poi.get("name", "EV Charging Station")
        brands = poi.get("brands", [])
        operator = brands[0].get("name") if brands else None
        address = address_info.get("freeformAddress")
        
        # Connectors
        connectors = []
        charging_park = raw.get("chargingPark", {})
        for conn in charging_park.get("connectors", []):
            type_name = conn.get("connectorType", "Unknown")
            power_kw = conn.get("ratedPowerKW")
            connectors.append(ConnectorInfo(type_name=type_name, power_kw=power_kw))
            
        provider_station_id = str(raw["id"])
        data_sources = raw.get("dataSources", {})
        availability = data_sources.get("chargingAvailability", {})
        availability_id = availability.get("id")
        supports_live = bool(availability_id)
        
        metadata = ChargingProviderMetadata(
            provider=self._PROVIDER_NAME,
            provider_version=self._PROVIDER_VERSION,
            provider_station_id=provider_station_id,
            fetched_at=datetime.now(timezone.utc).isoformat(),
            latency_ms=latency_ms,
            supports_live_availability=supports_live,
            raw_source=raw
        )

        return ChargingStation(
            id=f"tomtom_{provider_station_id}",
            name=name,
            latitude=float(lat),
            longitude=float(lon),
            address=address,
            operator=operator,
            connectors=connectors,
            provider_metadata=metadata
        )

    async def health_check(self) -> dict[str, Any]:
        start = time.time()
        try:
            if not settings.tom_tom_api_key:
                raise ValueError("Missing TOM_TOM_API_KEY")
                
            params = {
                "key": settings.tom_tom_api_key,
                "lat": 0,
                "lon": 0,
                "radius": 1000,
                "categorySet": 7309,
                "limit": 1
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(self._BASE_URL, params=params)
                resp.raise_for_status()
                
            return {
                "healthy": True,
                "latency_ms": (time.time() - start) * 1000,
                "provider_name": self._PROVIDER_NAME,
                "provider_version": self._PROVIDER_VERSION,
                "error": None
            }
        except Exception as e:
            return {
                "healthy": False,
                "latency_ms": (time.time() - start) * 1000,
                "provider_name": self._PROVIDER_NAME,
                "provider_version": self._PROVIDER_VERSION,
                "error": str(e)
            }
