import math
from typing import List

from app.schemas.charging import ChargingStation, ChargingScoringBreakdown
from app.core.config import settings

class ChargingScoringService:
    """
    Calculates a numerical score for every eligible charging station.
    The final score (0-100) is a weighted sum of normalized factors.
    """
    
    def __init__(self):
        self.w_dist = settings.charging_weight_distance
        self.w_power = settings.charging_weight_power
        self.w_oper = settings.charging_weight_operator
        self.w_conn = settings.charging_weight_connectors
        self.preferred_ops = [op.strip().lower() for op in settings.charging_preferred_operators.split(",") if op.strip()]
        
        # Max detour sets the scale for distance scoring. Distance score drops to 0 at max_detour_km.
        self.max_detour_km = settings.charging_max_detour_km

    def _haversine(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2)**2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _distance_to_route_details(self, station: ChargingStation, route_coordinates: List[List[float]]) -> dict:
        if not route_coordinates:
            return {"detour_km": 0.0, "along_route_km": 0.0}
            
        min_dist = float('inf')
        best_along_route_km = 0.0
        
        current_along_route_km = 0.0
        prev_lon, prev_lat = route_coordinates[0]
        
        for lon, lat in route_coordinates:
            segment_dist = self._haversine(prev_lon, prev_lat, lon, lat)
            current_along_route_km += segment_dist
            
            dist = self._haversine(station.longitude, station.latitude, lon, lat)
            if dist < min_dist:
                min_dist = dist
                best_along_route_km = current_along_route_km
                
            prev_lon, prev_lat = lon, lat
            
        return {"detour_km": min_dist, "along_route_km": best_along_route_km}

    def score_station(self, station: ChargingStation, route_coordinates: List[List[float]]) -> ChargingScoringBreakdown:
        breakdown = ChargingScoringBreakdown()
        
        # 1. Distance Score (Closer is better)
        details = self._distance_to_route_details(station, route_coordinates)
        detour_km = details["detour_km"]
        breakdown.detour_km = detour_km
        breakdown.along_route_km = details["along_route_km"]
        if detour_km <= 0.5:
            norm_dist = 1.0
        elif detour_km >= self.max_detour_km:
            norm_dist = 0.0
        else:
            # Linear decay from 0.5km to max_detour_km
            norm_dist = 1.0 - ((detour_km - 0.5) / (self.max_detour_km - 0.5))
        
        breakdown.distance_score = norm_dist * self.w_dist * 100
        
        # 2. Power Score (Higher is better, normalized to 150kW)
        max_power = 0.0
        if station.connectors:
            max_power = max((c.power_kw or 0.0) for c in station.connectors)
            
        penalty = 0.0
        if max_power > 0 and max_power < 25.0:
            # Extremely slow AC charger. Heavily penalize for mid-trip charging.
            norm_power = 0.0
            penalty = -50.0  # Ensure any fast charger off-route beats this
        elif max_power == 0.0:
            # Unknown power. Assume standard 50kW but penalize slightly for uncertainty.
            norm_power = 50.0 / 150.0
            penalty = -10.0
        else:
            norm_power = min(max_power / 150.0, 1.0)
            
        breakdown.power_score = norm_power * self.w_power * 100
        
        # 3. Operator Score (Preferred gets 1.0, others 0.0)
        norm_oper = 0.0
        if station.operator and station.operator.lower() in self.preferred_ops:
            norm_oper = 1.0
        breakdown.operator_score = norm_oper * self.w_oper * 100
        
        # 4. Connectors Score (More is better, normalized to 4 connectors)
        num_connectors = len(station.connectors)
        norm_conn = min(num_connectors / 4.0, 1.0)
        breakdown.connectors_score = norm_conn * self.w_conn * 100
        
        # Total Score
        breakdown.total_score = (
            breakdown.distance_score + 
            breakdown.power_score + 
            breakdown.operator_score + 
            breakdown.connectors_score +
            penalty
        )
        
        return breakdown
