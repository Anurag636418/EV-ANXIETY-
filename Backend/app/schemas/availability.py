from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

from app.schemas.charging import ChargingProviderMetadata

class AvailabilityStatus(str, Enum):
    AVAILABLE = "Available"
    OCCUPIED = "Occupied"
    UNKNOWN = "Unknown"
    OUT_OF_SERVICE = "Out of Service"

class ChargingAvailability(BaseModel):
    """
    Normalized real-time availability of a charging station.
    Hides provider-specific JSON shapes.
    """
    provider: str
    provider_station_id: str
    status: AvailabilityStatus
    available_connectors: int = 0
    occupied_connectors: int = 0
    total_connectors: int = 0
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    supports_live_status: bool = True
    provider_metadata: dict = Field(default_factory=dict)

class ChargingAvailabilityRequest(BaseModel):
    """
    Sent by the frontend to request live availability for a station.
    Passes the provider metadata so the backend knows how to query the provider.
    """
    station_id: str
    provider_metadata: ChargingProviderMetadata
