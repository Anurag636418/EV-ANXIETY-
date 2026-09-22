import time
import pytest
from httpx import Response
from unittest.mock import AsyncMock, patch
from app.schemas.availability import ChargingAvailabilityRequest
from app.schemas.charging import ChargingProviderMetadata
from app.services.availability_service import AvailabilityService
from app.services.availability.provider.tomtom_provider import TomTomAvailabilityProvider
import asyncio

@pytest.fixture
def mock_availability_request():
    return ChargingAvailabilityRequest(
        station_id="test_station_1",
        provider_metadata=ChargingProviderMetadata(
            provider="TomTom",
            provider_version="1",
            provider_station_id="POI_1",
            fetched_at="",
            latency_ms=1.0,
            supports_live_availability=True,
            raw_source={
                "dataSources": {
                    "chargingAvailability": {
                        "id": "AVAIL_123"
                    }
                }
            }
        )
    )

@pytest.mark.asyncio
async def test_availability_popup_latency(mock_availability_request):
    """
    Performance test that measures the end-to-end latency of fetching 
    live availability from the simulated moment the popup opens.
    """
    svc = AvailabilityService()
    
    # Mock network call to take 200ms
    async def mock_network_call(*args, **kwargs):
        await asyncio.sleep(0.2)
        return "fake_data"
        
    mock_provider = AsyncMock()
    mock_provider.get_availability.side_effect = mock_network_call
    svc.providers["TomTom"] = mock_provider
    
    start_time = time.time()
    await svc.get_availability(mock_availability_request)
    latency_ms = (time.time() - start_time) * 1000
    
    # Assert that internal overhead is minimal (should take barely more than 200ms)
    assert 200 <= latency_ms < 250, f"Latency was {latency_ms}ms, expected ~200ms"
    
    # Second fetch should hit cache and be near 0ms
    start_time = time.time()
    await svc.get_availability(mock_availability_request)
    cache_latency_ms = (time.time() - start_time) * 1000
    
    assert cache_latency_ms < 10, f"Cache latency was {cache_latency_ms}ms, expected near 0ms"
