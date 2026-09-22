import logging
import math

from app.services.charging.strategy import ChargingSearchStrategy

logger = logging.getLogger(__name__)

class AdaptiveWaypointStrategy(ChargingSearchStrategy):
    def __init__(self, interval_km: float = 45.0, max_waypoints: int = 15):
        self.interval_km = interval_km
        self.max_waypoints = max_waypoints

    def _haversine(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2)**2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def generate_waypoints(self, coordinates: list[list[float]]) -> list[list[float]]:
        if not coordinates:
            return []
            
        waypoints = [coordinates[0]]
        accumulated_dist = 0.0
        
        for i in range(1, len(coordinates)):
            prev = coordinates[i-1]
            curr = coordinates[i]
            dist = self._haversine(prev[0], prev[1], curr[0], curr[1])
            accumulated_dist += dist
            
            if accumulated_dist >= self.interval_km:
                waypoints.append(curr)
                accumulated_dist = 0.0
                
        # Always include the destination if it's far enough from the last waypoint
        if len(waypoints) == 1 or self._haversine(waypoints[-1][0], waypoints[-1][1], coordinates[-1][0], coordinates[-1][1]) > 5.0:
            waypoints.append(coordinates[-1])
            
        # Hard cap to prevent runaway API costs
        if len(waypoints) > self.max_waypoints:
            logger.warning("[charging] waypoints exceeded max %d, truncating", self.max_waypoints)
            waypoints = waypoints[:self.max_waypoints]
            
        return waypoints
