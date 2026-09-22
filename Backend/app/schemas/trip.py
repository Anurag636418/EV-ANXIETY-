from pydantic import BaseModel, Field, model_validator

from app.schemas.charging import ChargingResponse, ChargingStation
from app.schemas.route import RouteResponse
from app.schemas.place import Place
from app.schemas.vehicle import VehicleInput
from app.schemas.range_estimate import RangeEstimate


class TripPlanRequest(BaseModel):
    """
    Single request that drives the full trip planning pipeline.
    Optional overrides allow per-request tuning without changing server config.
    """

    origin: Place
    destination: Place

    @model_validator(mode='before')
    @classmethod
    def validate_coordinates(cls, data: any) -> any:
        if isinstance(data, dict):
            for field in ['origin', 'destination']:
                val = data.get(field)
                if isinstance(val, str) or (isinstance(val, dict) and ('latitude' not in val or 'longitude' not in val)):
                    raise ValueError("Please select a location from the autocomplete suggestions.")
        return data

    # Per-request override of the server default; None means "use config"
    charging_radius_km: float | None = Field(
        default=None,
        gt=0,
        le=50,
        description="Override the default charging search radius (km)",
    )

    vehicle: VehicleInput | None = Field(
        default=None,
        description="Optional vehicle selection and SOC for range estimation",
    )


class TripSummary(BaseModel):
    """
    High-level trip metrics, aggregated from all pipeline stages.
    Intentionally minimal now; extended in later sprints without
    requiring schema migrations (all new fields should be Optional).
    """

    distance_meters: float
    duration_seconds: float
    charging_stations_found: int
    filtered_stations: int = 0
    highest_score: float = 0.0
    average_score: float = 0.0
    recommended_provider: str | None = None
    recommendation_generation_time_ms: float = 0.0

class ChargingRecommendation(BaseModel):
    recommended_station: ChargingStation | None = None
    recommended_score: float = 0.0
    recommendation_reason: list[str] = Field(default_factory=list)
    estimated_detour_km: float = 0.0
    along_route_km: float = 0.0
    alternative_stations: list[ChargingStation] = Field(default_factory=list)

class DriveSegment(BaseModel):
    segment_type: str = "DRIVE"
    origin_name: str
    destination_name: str
    distance_meters: float
    duration_seconds: float
    start_soc_percent: float
    end_soc_percent: float
    energy_used_kwh: float
    route: RouteResponse

class ChargeSegment(BaseModel):
    segment_type: str = "CHARGE"
    station: ChargingStation
    start_soc_percent: float
    end_soc_percent: float
    energy_added_kwh: float
    duration_seconds: float
    estimated_cost_inr: float

class TripPlanResponse(BaseModel):
    """
    Unified trip plan returned by TripPlanningService.
    Each sub-object is independently versioned so route, charging,
    and recommendation schemas can evolve separately.
    """

    route: RouteResponse
    charging: ChargingResponse
    range_estimate: RangeEstimate | None = None
    recommendation: ChargingRecommendation | None = None
    summary: TripSummary
    itinerary: list[DriveSegment | ChargeSegment] = Field(default_factory=list)
