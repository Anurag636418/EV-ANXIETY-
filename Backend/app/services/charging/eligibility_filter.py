import math
from typing import List
import logging

from app.schemas.charging import ChargingStation
from app.core.config import settings

logger = logging.getLogger(__name__)

class EligibilityFilter:
    """
    Pre-scoring stage that excludes charging stations that are clearly unsuitable.
    """
    
    def __init__(self):
        self.max_detour_km = settings.charging_max_detour_km

    def _haversine(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2)**2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _distance_to_route(self, station: ChargingStation, route_coordinates: List[List[float]]) -> float:
        if not route_coordinates:
            return 0.0
            
        min_dist = float('inf')
        for lon, lat in route_coordinates:
            dist = self._haversine(station.longitude, station.latitude, lon, lat)
            if dist < min_dist:
                min_dist = dist
        return min_dist

    def filter_stations(self, stations: List[ChargingStation], route_coordinates: List[List[float]]) -> tuple[List[ChargingStation], int]:
        """
        Filters out stations based on max detour and missing essential metadata.
        Returns a tuple of (eligible_stations, filtered_count).
        """
        eligible = []
        filtered_count = 0
        
        for station in stations:
            # Drop if no connectors
            if not station.connectors:
                filtered_count += 1
                continue
                
            # Drop if too far from route
            detour_km = self._distance_to_route(station, route_coordinates)
            if detour_km > self.max_detour_km:
                filtered_count += 1
                continue
                
            # Store the detour_km on the station object temporarily, 
            # or we recalculate in scoring service. Let's just recalculate in scoring service to keep models clean,
            # or we can pass it if we wrap it. Recalculating is fine for small lists (e.g. 100 stations).
            
            eligible.append(station)
            
        logger.debug(f"[eligibility_filter] filtered_out={filtered_count}, remaining={len(eligible)}")
        return eligible, filtered_count
