from pydantic import BaseModel

class RangeEstimate(BaseModel):
    estimated_range_km: float
    estimated_consumption_kwh: float
    estimated_arrival_soc_percent: float
    energy_shortfall_kwh: float
    can_reach_destination: bool
    charging_stops_needed: int
    estimated_cost_inr: float
    cost_rate_per_kwh: float
    disclaimer: str
    trip_feasible_with_charging: str | None = None
