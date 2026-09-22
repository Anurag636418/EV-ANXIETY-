from pydantic import BaseModel, Field

class EVVehicle(BaseModel):
    id: str
    make: str
    model: str
    variant: str | None = None
    battery_capacity_kwh: float
    efficiency_kwh_per_100km: float
    connector_types: list[str] = Field(default_factory=list)
    source_reference: str | None = None

class VehicleInput(BaseModel):
    vehicle_id: str | None = None
    battery_capacity_kwh: float | None = None
    current_soc_percent: float = Field(ge=0, le=100)
    efficiency_kwh_per_100km: float | None = None
