import time
from typing import List

from app.schemas.charging import ChargingStation, ChargingScoringBreakdown
from app.schemas.trip import ChargingRecommendation
from app.services.charging.eligibility_filter import EligibilityFilter
from app.services.charging.scoring_service import ChargingScoringService

class ChargingRecommendationService:
    """
    Intelligently recommends the best charging station based on deterministic scoring.
    """
    
    def __init__(self):
        self.filter = EligibilityFilter()
        self.scoring = ChargingScoringService()

    def generate_explanation(self, station: ChargingStation, breakdown: ChargingScoringBreakdown) -> List[str]:
        reasons = []
        
        # Power reason
        max_power = 0.0
        if station.connectors:
            max_power = max((c.power_kw or 0.0) for c in station.connectors)
        if max_power >= 150:
            reasons.append(f"✓ {int(max_power)} kW ultra-fast charger")
        elif max_power >= 50:
            reasons.append(f"✓ {int(max_power)} kW fast charger")
            
        # Distance reason
        if breakdown.detour_km <= 1.0:
            reasons.append("✓ Directly on your route")
        elif breakdown.detour_km <= 5.0:
            reasons.append(f"✓ Only {breakdown.detour_km:.1f} km off your route")
            
        # Operator reason
        if breakdown.operator_score > 0 and station.operator:
            reasons.append(f"✓ Trusted operator ({station.operator})")
            
        # Connectors reason
        num_connectors = len(station.connectors)
        if num_connectors > 2:
            reasons.append(f"✓ Multiple connectors available ({num_connectors})")
            
        # Fallback if no specific high points
        if not reasons:
            reasons.append("✓ Best available option on this route segment")
            
        return reasons

    def rank_stations(self, stations: List[ChargingStation], route_coordinates: List[List[float]]) -> List[tuple[ChargingStation, ChargingScoringBreakdown]]:
        eligible_stations, _ = self.filter.filter_stations(stations, route_coordinates)
        if not eligible_stations:
            return []
            
        scored_pairs = []
        for station in eligible_stations:
            breakdown = self.scoring.score_station(station, route_coordinates)
            scored_pairs.append((station, breakdown))
            
        scored_pairs.sort(key=lambda x: x[1].total_score, reverse=True)
        return scored_pairs

    def recommend(self, stations: List[ChargingStation], route_coordinates: List[List[float]]) -> tuple[ChargingRecommendation | None, dict]:
        start_time = time.time()
        
        # 1. Filter
        eligible_stations, filtered_count = self.filter.filter_stations(stations, route_coordinates)
        if not eligible_stations:
            telemetry = {
                "filtered_stations": filtered_count,
                "highest_score": 0.0,
                "average_score": 0.0,
                "recommended_provider": None,
                "generation_time_ms": (time.time() - start_time) * 1000
            }
            return None, telemetry
            
        # 2. Score
        scored_pairs = []
        total_score_sum = 0.0
        
        for station in eligible_stations:
            breakdown = self.scoring.score_station(station, route_coordinates)
            scored_pairs.append((station, breakdown))
            total_score_sum += breakdown.total_score
            
        # 3. Sort by total_score descending
        scored_pairs.sort(key=lambda x: x[1].total_score, reverse=True)
        
        top_station, top_breakdown = scored_pairs[0]
        top_breakdown.reasons = self.generate_explanation(top_station, top_breakdown)
        
        alternatives = [pair[0] for pair in scored_pairs[1:4]]
        
        recommendation = ChargingRecommendation(
            recommended_station=top_station,
            recommended_score=round(top_breakdown.total_score, 1),
            recommendation_reason=top_breakdown.reasons,
            estimated_detour_km=round(top_breakdown.detour_km, 1),
            along_route_km=round(top_breakdown.along_route_km, 1),
            alternative_stations=alternatives
        )
        
        telemetry = {
            "filtered_stations": filtered_count,
            "highest_score": top_breakdown.total_score,
            "average_score": total_score_sum / len(scored_pairs),
            "recommended_provider": top_station.provider_metadata.provider if top_station.provider_metadata else None,
            "generation_time_ms": (time.time() - start_time) * 1000
        }
        
        return recommendation, telemetry
