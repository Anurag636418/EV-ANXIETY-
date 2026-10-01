import logging
import time
from typing import Dict, Tuple
from app.schemas.availability import ChargingAvailability, ChargingAvailabilityRequest, AvailabilityStatus
from app.schemas.charging import ChargingProviderMetadata
from app.services.availability.provider.tomtom_provider import TomTomAvailabilityProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class AvailabilityService:
    """
    Service responsible for fetching and caching real-time charging station availability.
    """
    
    def __init__(self):
        self.providers = {
            "TomTom": TomTomAvailabilityProvider()
        }
        # Simple in-memory cache: { "provider:availability_id": (timestamp, ChargingAvailability) }
        self._cache: Dict[str, Tuple[float, ChargingAvailability]] = {}
        self.ttl = settings.availability_cache_ttl_seconds

    async def get_availability(self, request: ChargingAvailabilityRequest) -> ChargingAvailability:
        provider_name = request.provider_metadata.provider
        
        # Extract availability_id from raw_source
        raw_source = request.provider_metadata.raw_source or {}
        if provider_name == "TomTom":
            availability_id = raw_source.get("dataSources", {}).get("chargingAvailability", {}).get("id")
        else:
            availability_id = None
            
        if not availability_id:
            raise ValueError(
                f"No availability ID found for station {request.station_id}. "
                f"This station may not support live availability."
            )
            
        cache_key = f"{provider_name}:{availability_id}"
        
        # Check cache
        if cache_key in self._cache:
            timestamp, cached_data = self._cache[cache_key]
            if time.time() - timestamp < self.ttl:
                logger.debug(f"[AvailabilityService] Cache hit for {cache_key}")
                return cached_data
                
        # Cache miss, fetch from provider
        logger.debug(f"[AvailabilityService] Cache miss for {cache_key}, fetching...")
        provider = self.providers.get(provider_name)
        if not provider:
            raise ValueError(f"Provider {provider_name} not supported for availability")
            
        availability = await provider.get_availability(availability_id)
        
        # Update cache
        self._cache[cache_key] = (time.time(), availability)
        
        return availability
