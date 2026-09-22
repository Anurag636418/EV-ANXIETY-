from abc import ABC, abstractmethod
from typing import Any
from pydantic import BaseModel
from app.schemas.place import Place
from app.schemas.route import RouteGeometry, ProviderMetadata

class RouteResult(BaseModel):
    geometry: RouteGeometry
    distance_meters: float
    duration_seconds: float
    provider: ProviderMetadata

class RoutingProvider(ABC):
    @abstractmethod
    async def compute_route(self, origin: Place, destination: Place) -> RouteResult:
        """
        Compute a route between origin and destination places.
        Returns a normalized RouteResult.
        """
        pass
