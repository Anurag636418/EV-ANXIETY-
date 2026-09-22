from abc import ABC, abstractmethod

class ChargingDiscoveryError(Exception):
    pass

class ChargingSearchStrategy(ABC):
    @abstractmethod
    def generate_waypoints(self, coordinates: list[list[float]]) -> list[list[float]]:
        """
        Generate a list of waypoints to search for charging stations.
        """
        pass
