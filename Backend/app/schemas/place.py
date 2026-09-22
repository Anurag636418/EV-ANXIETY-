from pydantic import BaseModel, Field

class Place(BaseModel):
    display_name: str = Field(..., description="Full display name of the place")
    latitude: float = Field(..., description="Latitude of the place")
    longitude: float = Field(..., description="Longitude of the place")
    osm_id: int | str | None = Field(default=None, description="OpenStreetMap ID")
    osm_type: str | None = Field(default=None, description="OpenStreetMap type (node, way, relation)")
    importance: float | None = Field(default=None, description="Importance score from geocoder")
    city: str | None = Field(default=None)
    state: str | None = Field(default=None)
    country: str | None = Field(default=None)

class PlaceSearchResponse(BaseModel):
    results: list[Place]
