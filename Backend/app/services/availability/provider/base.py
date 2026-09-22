import abc
from app.schemas.availability import ChargingAvailability

class AvailabilityProvider(abc.ABC):
    """
    Abstract base class for all real-time charging availability providers.
    Ensures all providers return a normalized ChargingAvailability object.
    """

    @property
    @abc.abstractmethod
    def name(self) -> str:
        """The canonical name of the provider (e.g., 'TomTom')."""
        pass

    @abc.abstractmethod
    async def get_availability(self, availability_id: str) -> ChargingAvailability:
        """
        Fetch real-time availability for a specific station.
        Raises exceptions (e.g. ValueError, HTTPError) on failure.
        """
        pass

    @abc.abstractmethod
    async def health_check(self) -> bool:
        """
        Verify the provider API is accessible.
        """
        pass
