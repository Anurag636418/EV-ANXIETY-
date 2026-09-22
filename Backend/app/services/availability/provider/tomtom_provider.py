import httpx
import logging
from datetime import datetime
from typing import Any

from app.core.config import settings
from app.schemas.availability import ChargingAvailability, AvailabilityStatus
from app.services.availability.provider.base import AvailabilityProvider

logger = logging.getLogger(__name__)

class TomTomAvailabilityProvider(AvailabilityProvider):
    def __init__(self):
        self.api_key = settings.tom_tom_api_key
        self.base_url = "https://api.tomtom.com/search/2/chargingAvailability.json"

    @property
    def name(self) -> str:
        return "TomTom"

    async def get_availability(self, availability_id: str) -> ChargingAvailability:
        if not self.api_key:
            raise ValueError("TomTom API key not configured")

        params = {
            "key": self.api_key,
            "chargingAvailability": availability_id
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.base_url, params=params, timeout=5.0)
                response.raise_for_status()
                data = response.json()
                return self._normalize_response(availability_id, data)
            except httpx.HTTPStatusError as e:
                logger.error(f"[TomTomAvailabilityProvider] HTTP error fetching availability: {e.response.text}")
                raise
            except httpx.RequestError as e:
                logger.error(f"[TomTomAvailabilityProvider] Request error: {str(e)}")
                raise

    def _normalize_response(self, availability_id: str, data: dict[str, Any]) -> ChargingAvailability:
        available = 0
        occupied = 0
        total = 0

        connectors = data.get("connectors", [])
        for connector in connectors:
            total += connector.get("total", 0)
            avail_data = connector.get("availability", {}).get("current", {})
            available += avail_data.get("available", 0)
            occupied += avail_data.get("occupied", 0)
            occupied += avail_data.get("reserved", 0) # Reserved counts as occupied for the user
            # We ignore unknown/outOfService for the top-line available/occupied counts, 
            # though they could affect the overall status if we wanted.

        if total == 0:
            status = AvailabilityStatus.UNKNOWN
        elif available > 0:
            status = AvailabilityStatus.AVAILABLE
        elif occupied >= total or available == 0:
            status = AvailabilityStatus.OCCUPIED
        else:
            status = AvailabilityStatus.UNKNOWN

        return ChargingAvailability(
            provider=self.name,
            provider_station_id=availability_id,
            status=status,
            available_connectors=available,
            occupied_connectors=occupied,
            total_connectors=total,
            last_updated=datetime.utcnow(),
            supports_live_status=True,
            provider_metadata={"raw_connectors": len(connectors)}
        )

    async def health_check(self) -> bool:
        return bool(self.api_key)
