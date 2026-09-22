import math
from typing import List
from app.schemas.charging import ChargingStation

class ChargingStationRanker:
    """
    Sorts and ranks EV charging stations for optimal display and recommendation.
    """
    
    def __init__(self):
        # Provider priorities (lower is better)
        self.provider_priority = {
            "TomTom": 1,
            "OpenChargeMap": 2
        }

    def _haversine(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2)**2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _distance_to_route(self, station: ChargingStation, route_coordinates: List[List[float]]) -> float:
        """Finds the minimum distance from the station to any point on the route linestring."""
        if not route_coordinates:
            return 0.0
            
        min_dist = float('inf')
        for lon, lat in route_coordinates:
            dist = self._haversine(station.longitude, station.latitude, lon, lat)
            if dist < min_dist:
                min_dist = dist
        return min_dist

    def _max_power(self, station: ChargingStation) -> float:
        """Finds the maximum power available at the station."""
        if not station.connectors:
            return 0.0
        return max((c.power_kw or 0.0) for c in station.connectors)

    def rank(self, stations: List[ChargingStation], route_coordinates: List[List[float]]) -> List[ChargingStation]:
        if not stations:
            return []

        def sort_key(station: ChargingStation):
            # 1. Primary: Distance to route (ascending)
            dist = self._distance_to_route(station, route_coordinates)
            # 2. Secondary: Charging power (descending)
            power = self._max_power(station)
            # 3. Tertiary: Provider priority (ascending)
            provider_name = station.provider_metadata.provider if station.provider_metadata else "Unknown"
            priority = self.provider_priority.get(provider_name, 99)
            
            return (dist, -power, priority)

        return sorted(stations, key=sort_key)
