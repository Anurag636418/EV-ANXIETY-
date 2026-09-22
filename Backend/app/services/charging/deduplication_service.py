import math
from typing import List
import logging

from app.schemas.charging import ChargingStation
from app.core.config import settings

logger = logging.getLogger(__name__)

class DeduplicationService:
    """
    Removes duplicates from a list of charging stations, merging metadata if necessary.
    """
    
    def __init__(self):
        self.distance_threshold = settings.charging_dedup_distance_meters / 1000.0  # convert to km
        
    def _haversine(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2)**2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def deduplicate(self, stations: List[ChargingStation]) -> List[ChargingStation]:
        if not stations:
            return []
            
        unique_stations: List[ChargingStation] = []
        duplicates_removed = 0
        
        for station in stations:
            is_duplicate = False
            for existing in unique_stations:
                # 1. Exact ID match (unlikely across providers, but good for same provider)
                if station.id == existing.id:
                    is_duplicate = True
                    break
                    
                # 2. Check distance
                dist_km = self._haversine(
                    station.longitude, station.latitude,
                    existing.longitude, existing.latitude
                )
                
                if dist_km <= self.distance_threshold:
                    # Very close. Let's check name or operator to be safe.
                    # Or we just assume it's a duplicate if within 25m. The requirement:
                    # Priority 2: Coordinates within 25 meters
                    # Let's consider them duplicates.
                    
                    # Merge logic: if TomTom is existing and OCM is new, keep TomTom (TomTom has better data)
                    # For now, keep the one already in unique_stations (we rely on ranker or order of insertion)
                    is_duplicate = True
                    break
            
            if is_duplicate:
                duplicates_removed += 1
            else:
                unique_stations.append(station)
                
        logger.debug(f"[dedup] Removed {duplicates_removed} duplicates.")
        return unique_stations
