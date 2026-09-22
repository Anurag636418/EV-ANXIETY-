import pytest
from httpx import Response
from unittest.mock import AsyncMock, patch
from app.schemas.availability import ChargingAvailabilityRequest, AvailabilityStatus
from app.schemas.charging import ChargingProviderMetadata
from app.services.availability_service import AvailabilityService
from app.services.availability.provider.tomtom_provider import TomTomAvailabilityProvider

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

def test_tomtom_normalization():
    provider = TomTomAvailabilityProvider()
    
    mock_api_response = {
        "connectors": [
            {
                "type": "IEC62196Type2CCS",
                "total": 4,
                "availability": {
                    "current": {
                        "available": 1,
                        "occupied": 2,
                        "reserved": 1,
                        "unknown": 0,
                        "outOfService": 0
                    }
                }
            },
            {
                "type": "Other",
                "total": 2,
                "availability": {
                    "current": {
                        "available": 0,
                        "occupied": 0,
                        "reserved": 0,
                        "unknown": 2,
                        "outOfService": 0
                    }
                }
            }
        ]
    }
    
    res = provider._normalize_response("AVAIL_123", mock_api_response)
    assert res.provider == "TomTom"
    assert res.provider_station_id == "AVAIL_123"
    assert res.total_connectors == 6
    assert res.available_connectors == 1
    assert res.occupied_connectors == 3 # 2 occupied + 1 reserved
    assert res.status == AvailabilityStatus.AVAILABLE
    
def test_tomtom_normalization_occupied():
    provider = TomTomAvailabilityProvider()
    mock_api_response = {
        "connectors": [
            {
                "total": 2,
                "availability": {
                    "current": {
                        "available": 0,
                        "occupied": 2,
                        "reserved": 0,
                        "unknown": 0,
                        "outOfService": 0
                    }
                }
            }
        ]
    }
    res = provider._normalize_response("AVAIL_123", mock_api_response)
    assert res.status == AvailabilityStatus.OCCUPIED

@pytest.mark.asyncio
async def test_availability_service_caching(mock_availability_request):
    svc = AvailabilityService()
    svc.ttl = 60 # 60 seconds
    
    # Mock the provider's get_availability
    mock_provider = AsyncMock()
    mock_provider.get_availability.return_value = "fake_availability_data"
    svc.providers["TomTom"] = mock_provider
    
    # First call
    res1 = await svc.get_availability(mock_availability_request)
    assert res1 == "fake_availability_data"
    assert mock_provider.get_availability.call_count == 1
    
    # Second call should hit cache
    res2 = await svc.get_availability(mock_availability_request)
    assert res2 == "fake_availability_data"
    assert mock_provider.get_availability.call_count == 1 # Still 1
