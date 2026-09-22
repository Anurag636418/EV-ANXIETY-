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

class OpenChargeMapProvider(ChargingProvider):
    """
    OpenChargeMap implementation of the ChargingProvider interface.
    """
    
    _BASE_URL = "https://api.openchargemap.io/v3/poi/"
    _PROVIDER_NAME = "OpenChargeMap"
    _PROVIDER_VERSION = "v3"

    async def search_along_route(
        self,
        waypoints: list[list[float]],
        radius_km: float
    ) -> tuple[list[ChargingStation], dict[str, Any]]:
        
        stations: list[ChargingStation] = []
        seen_ids = set()
        
        headers = {
            "User-Agent": "intelligent-ev-trip-planner-development",
            "X-Api-Key": settings.openchargermap_api_key,
        }
        
        async def fetch_waypoint(client: httpx.AsyncClient, lon: float, lat: float):
            params = {
                "output": "json",
                "latitude": lat,
                "longitude": lon,
                "distance": radius_km,
                "distanceunit": "KM",
                "maxresults": 50,
                "compact": "true",
                "verbose": "false",
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
        
        api_calls = 0
        total_latency = 0.0
        provider_errors = 0
        
        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            tasks = [fetch_waypoint(client, lon, lat) for lon, lat in waypoints]
            results = await asyncio.gather(*tasks)
            
            for data, latency, error in results:
                if error:
                    provider_errors += 1
                    continue
                    
                api_calls += 1
                total_latency += latency
                
                if not isinstance(data, list):
                    continue
                    
                for raw in data:
                    station_id = str(raw.get("ID", ""))
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
        addr_info = raw.get("AddressInfo") or {}
        lat = addr_info.get("Latitude")
        lon = addr_info.get("Longitude")

        if lat is None or lon is None:
            return None

        address_parts = [
            addr_info.get("AddressLine1"),
            addr_info.get("Town"),
            addr_info.get("StateOrProvince"),
            addr_info.get("Postcode"),
        ]
        address = ", ".join(part for part in address_parts if part) or None
        operator = (raw.get("OperatorInfo") or {}).get("Title") or None

        connectors = []
        for conn in raw.get("Connections") or []:
            type_title = (conn.get("ConnectionType") or {}).get("Title", "Unknown")
            power_kw = conn.get("PowerKW")
            connectors.append(ConnectorInfo(type_name=type_title, power_kw=power_kw))

        provider_station_id = str(raw["ID"])
        
        metadata = ChargingProviderMetadata(
            provider=self._PROVIDER_NAME,
            provider_version=self._PROVIDER_VERSION,
            provider_station_id=provider_station_id,
            fetched_at=datetime.now(timezone.utc).isoformat(),
            latency_ms=latency_ms,
            supports_live_availability=False,
            raw_source=raw
        )

        return ChargingStation(
            id=f"ocm_{provider_station_id}",
            name=addr_info.get("Title") or "EV Charging Station",
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
            headers = {
                "User-Agent": "intelligent-ev-trip-planner-development",
                "X-Api-Key": settings.openchargermap_api_key,
            }
            params = {"latitude": 0, "longitude": 0, "maxresults": 1}
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
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
