from abc import ABC, abstractmethod
from typing import Any

from app.schemas.charging import ChargingStation

class ChargingProvider(ABC):
    """
    Base interface for all EV Charging Providers.
    Charging Providers are strictly responsible for calling external APIs
    and normalizing the JSON responses into our standard ChargingStation model.
    They must NOT orchestrate waypoints, deduplicate, or rank results.
    """

    @abstractmethod
    async def search_along_route(
        self,
        waypoints: list[list[float]],
        radius_km: float
    ) -> tuple[list[ChargingStation], dict[str, Any]]:
        """
        Search for charging stations at the given waypoints.
        Returns a tuple of (stations, telemetry).
        Telemetry dict should include at minimum:
        - api_calls
        - latency_ms
        - provider_errors
        """
        pass

    @abstractmethod
    async def health_check(self) -> dict[str, Any]:
        """
        Ping the provider to verify connectivity and credentials.
        Returns a dict like:
        {
            "healthy": bool,
            "latency_ms": float,
            "provider_name": str,
            "provider_version": str,
            "error": str | None
        }
        """
        pass
