from pydantic import BaseModel, Field, model_validator
from app.schemas.place import Place

class RouteRequest(BaseModel):
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

class RoutePoint(BaseModel):
    label: str
    latitude: float
    longitude: float

class RouteGeometry(BaseModel):
    type: str
    coordinates: list[list[float]]

class ProviderMetadata(BaseModel):
    name: str
    # Future: could include timing, version, etc.

class RouteResponse(BaseModel):
    origin: RoutePoint
    destination: RoutePoint
    geometry: RouteGeometry
    distance_meters: float
    duration_seconds: float
    provider: ProviderMetadata
