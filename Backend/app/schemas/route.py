from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    origin: str = Field(min_length=1, examples=["Bengaluru"])
    destination: str = Field(min_length=1, examples=["Mysuru"])


class RoutePoint(BaseModel):
    label: str
    latitude: float
    longitude: float


class RouteGeometry(BaseModel):
    type: str
    coordinates: list[list[float]]


class RouteResponse(BaseModel):
    origin: RoutePoint
    destination: RoutePoint
    geometry: RouteGeometry
    distance_meters: float
    duration_seconds: float
