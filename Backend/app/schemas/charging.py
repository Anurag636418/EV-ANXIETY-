from pydantic import BaseModel, Field
from typing import Any


class ConnectorInfo(BaseModel):
    """A single connector on a charging station."""

    type_name: str
    power_kw: float | None = None


class ChargingProviderMetadata(BaseModel):
    """Metadata regarding the source of the charging station data."""
    provider: str
    provider_version: str
    provider_station_id: str
    fetched_at: str
    latency_ms: float
    supports_live_availability: bool = False
    raw_source: dict[str, Any] = Field(default_factory=dict)


class ChargingScoringBreakdown(BaseModel):
    """Structured breakdown of the scoring factors for a charging station."""
    distance_score: float = 0.0
    power_score: float = 0.0
    operator_score: float = 0.0
    connectors_score: float = 0.0
    detour_km: float = 0.0
    along_route_km: float = 0.0
    total_score: float = 0.0
    reasons: list[str] = Field(default_factory=list)

class ChargingStation(BaseModel):
    """A single EV charging station with location and capability data."""

    id: str
    name: str
    latitude: float
    longitude: float
    address: str | None = None
    operator: str | None = None
    connectors: list[ConnectorInfo] = Field(default_factory=list)
    provider_metadata: ChargingProviderMetadata | None = None


class ChargingRequest(BaseModel):
    """
    Request to find charging stations along a route.

    ``coordinates`` follows GeoJSON order: [longitude, latitude].
    ``radius_km`` overrides the server default when provided.
    """

    coordinates: list[list[float]] = Field(
        min_length=2,
        description="GeoJSON LineString coordinates: [[lon, lat], ...]",
    )
    radius_km: float = Field(
        default=5.0,
        gt=0,
        le=50,
        description="Search radius in kilometres around each sampled waypoint",
    )


class ChargingSearchSummary(BaseModel):
    """
    Metadata about how the search was performed.
    Kept extensible so future strategies (bounding box, isochrone, etc.)
    can add fields without breaking existing clients.
    """

    radius_km: float
    waypoints_searched: int
    waypoints_generated: int = 0
    total_found: int
    api_calls: int = 0
    api_latency_ms: float = 0.0
    duplicates_removed: int = 0
    merged_station_count: int = 0
    provider_errors: int = 0
    total_discovery_time_ms: float = 0.0


class ChargingResponse(BaseModel):
    """Response envelope for charging station discovery."""

    stations: list[ChargingStation]
    summary: ChargingSearchSummary
