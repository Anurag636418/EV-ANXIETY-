import logging

from app.core.config import settings
from app.schemas.charging import ChargingResponse, ChargingSearchSummary
from app.schemas.route import RouteResponse
from app.schemas.trip import TripPlanRequest, TripPlanResponse, TripSummary
from app.services.charging_service import ChargingService
from app.services.charging.strategy import ChargingDiscoveryError
from app.services.charging.recommendation_service import ChargingRecommendationService
from app.services.routing_service import RoutePlanningError, RoutingService
from app.services.range.range_service import RangeService, RangeEstimationError

logger = logging.getLogger(__name__)


class TripPlanningError(Exception):
    pass


class TripPlanningService:
    """
    Orchestrates the full trip planning pipeline.

    Current pipeline (Sprint 3):
        1. RoutingService    — geocode origin/destination, compute road geometry
        2. ChargingService   — discover charging stations along the route corridor
        3. RecommendationService — placeholder; returns [] until Sprint 6

    Each service is independently instantiable and testable. The orchestrator
    only wires inputs → outputs; it contains no external API calls itself.

    Adding a new pipeline stage (e.g. weather, battery prediction) means:
    - Injecting the new service here
    - Calling it with output from previous stages
    - Including its result in TripPlanResponse / TripSummary
    No other files need to change.
    """

    def __init__(self) -> None:
        self._routing = RoutingService()
        self._charging = ChargingService()
        self._recommendations = ChargingRecommendationService()
        self._range = RangeService()

    async def plan_trip(self, request: TripPlanRequest) -> TripPlanResponse:
        logger.debug(
            "[trip] stage=pipeline_start origin=%r destination=%r charging_radius_km=%s",
            request.origin,
            request.destination,
            request.charging_radius_km,
        )

        # Stage 1: Route (Full trip line)
        route: RouteResponse = await self._routing.plan_route(
            origin=request.origin,
            destination=request.destination,
        )

        # Stage 2: Charging stations along the entire corridor
        radius_km = request.charging_radius_km or settings.charging_search_radius_km
        try:
            charging: ChargingResponse = await self._charging.find_stations_along_route(
                coordinates=route.geometry.coordinates,
                radius_km=radius_km,
            )
        except ChargingDiscoveryError as exc:
            logger.error("[trip] stage=charging_provider_error error=%s", str(exc))
            charging = ChargingResponse(
                stations=[],
                summary=ChargingSearchSummary(radius_km=radius_km, waypoints_searched=0, total_found=0)
            )

        # Legacy backward compatibility stages
        range_estimate = None
        if request.vehicle:
            try:
                range_estimate = self._range.estimate_range(
                    vehicle_input=request.vehicle,
                    distance_meters=route.distance_meters
                )
            except Exception as exc:
                pass
        
        recommendation, rec_telemetry = self._recommendations.recommend(
            stations=charging.stations,
            route_coordinates=route.geometry.coordinates
        )
        
        if range_estimate:
            range_estimate.trip_feasible_with_charging = "YES" if range_estimate.can_reach_destination else "UNKNOWN"

        # --- ABRP MULTI-STOP ITINERARY ENGINE ---
        from app.schemas.trip import DriveSegment, ChargeSegment
        itinerary = []
        
        if request.vehicle:
            # Vehicle physics setup
            eff = request.vehicle.efficiency_kwh_per_100km or 15.0
            cap = request.vehicle.battery_capacity_kwh or 40.0
            if request.vehicle.vehicle_id:
                v_db = self._range.db.get_vehicle(request.vehicle.vehicle_id)
                if v_db:
                    eff = eff or v_db.efficiency_kwh_per_100km
                    cap = cap or v_db.battery_capacity_kwh
            
            # Start conditions
            current_soc = float(request.vehicle.current_soc_percent or 100.0)
            current_distance_km = 0.0
            total_trip_km = route.distance_meters / 1000.0
            
            # Rank all stations once
            ranked_stations = self._recommendations.rank_stations(charging.stations, route.geometry.coordinates)
            
            MIN_SOC = 10.0 # Anxiety Threshold (User configurable later)
            MAX_CHARGE_SOC = 80.0
            
            current_origin_name = request.origin.display_name or "Origin"
            
            while True:
                # Calculate how far we can go on current SOC
                usable_soc = current_soc - MIN_SOC
                reachable_km = (usable_soc / 100.0) * cap / (eff / 100.0)
                
                # Check if we can reach destination
                if current_distance_km + reachable_km >= total_trip_km:
                    # Final drive to destination
                    leg_km = total_trip_km - current_distance_km
                    leg_energy = (leg_km / 100.0) * eff
                    end_soc = current_soc - (leg_energy / cap * 100.0)
                    
                    itinerary.append(
                        DriveSegment(
                            origin_name=current_origin_name,
                            destination_name=request.destination.display_name or "Destination",
                            distance_meters=leg_km * 1000.0,
                            duration_seconds=(leg_km / 60.0) * 3600.0, # rough estimate 60km/h
                            start_soc_percent=round(current_soc, 1),
                            end_soc_percent=round(end_soc, 1),
                            energy_used_kwh=round(leg_energy, 2),
                            route=route # In V2 we can slice the geometry here
                        )
                    )
                    break
                    
                else:
                    # We cannot reach destination. Find the best charger in range.
                    max_reach_along_route = current_distance_km + reachable_km
                    
                    valid_pairs = [
                        pair for pair in ranked_stations 
                        if pair[1].along_route_km > current_distance_km + 5.0 # at least 5km ahead
                        and pair[1].along_route_km <= max_reach_along_route
                    ]
                    
                    if not valid_pairs:
                        logger.warning("Trip impossible within safe range, looking for any station ahead.")
                        # Fallback: Just find the next station ahead even if it means negative SOC
                        valid_pairs = [
                            pair for pair in ranked_stations
                            if pair[1].along_route_km > current_distance_km + 5.0
                        ]
                        # Sort by how close they are
                        valid_pairs.sort(key=lambda x: x[1].along_route_km)
                    
                    if not valid_pairs:
                        logger.warning("No stations ahead at all! Appending final drive with negative SOC.")
                        # Final drive to destination with negative SOC
                        leg_km = total_trip_km - current_distance_km
                        leg_energy = (leg_km / 100.0) * eff
                        end_soc = current_soc - (leg_energy / cap * 100.0)
                        
                        itinerary.append(
                            DriveSegment(
                                origin_name=current_origin_name,
                                destination_name=request.destination.display_name or "Destination",
                                distance_meters=leg_km * 1000.0,
                                duration_seconds=(leg_km / 60.0) * 3600.0,
                                start_soc_percent=round(current_soc, 1),
                                end_soc_percent=round(end_soc, 1),
                                energy_used_kwh=round(leg_energy, 2),
                                route=route
                            )
                        )
                        break
                        
                    # --- SMART CHARGER SELECTION ---
                    # We want to push the car deep into its range (arrive with lower SOC) to minimize stops.
                    # Let's filter to stations in the latter half of our reachable range.
                    min_push_km = current_distance_km + (reachable_km * 0.5)
                    ideal_pairs = [p for p in valid_pairs if p[1].along_route_km >= min_push_km]
                    
                    if ideal_pairs:
                        # Among ideal pairs, pick the one with the highest recommendation score
                        best_station, breakdown = ideal_pairs[0]
                    else:
                        # If no stations are in the ideal window, just pick the furthest available station
                        valid_pairs.sort(key=lambda x: x[1].along_route_km, reverse=True)
                        best_station, breakdown = valid_pairs[0]
                    
                    # 1. Drive to charger
                    leg_km = breakdown.along_route_km - current_distance_km
                    leg_energy = (leg_km / 100.0) * eff
                    arrival_soc = current_soc - (leg_energy / cap * 100.0)
                    
                    itinerary.append(
                        DriveSegment(
                            origin_name=current_origin_name,
                            destination_name=best_station.name,
                            distance_meters=leg_km * 1000.0,
                            duration_seconds=(leg_km / 60.0) * 3600.0,
                            start_soc_percent=round(current_soc, 1),
                            end_soc_percent=round(arrival_soc, 1),
                            energy_used_kwh=round(leg_energy, 2),
                            route=route
                        )
                    )
                    
                    # 2. Charge at station
                    remaining_trip = total_trip_km - breakdown.along_route_km
                    remaining_energy = (remaining_trip / 100.0) * eff
                    soc_needed_for_trip = (remaining_energy / cap * 100.0) + MIN_SOC
                    
                    # Determine target SOC securely to avoid negative charging times
                    # Usually charge up to 80%, but if we need more, go up to 100%. 
                    # Never charge less than we arrived with.
                    target_soc = max(arrival_soc + 10.0, soc_needed_for_trip)
                    if target_soc > 100.0:
                        target_soc = 100.0
                    elif target_soc > MAX_CHARGE_SOC and soc_needed_for_trip <= MAX_CHARGE_SOC:
                        target_soc = MAX_CHARGE_SOC
                        
                    target_soc = max(target_soc, arrival_soc)
                    
                    energy_added = (target_soc - arrival_soc) / 100.0 * cap
                    
                    max_kw = max([c.power_kw for c in best_station.connectors if c.power_kw] or [50.0])
                    charge_time_seconds = (energy_added / max_kw) * 3600.0
                    
                    itinerary.append(
                        ChargeSegment(
                            station=best_station,
                            start_soc_percent=round(arrival_soc, 1),
                            end_soc_percent=round(target_soc, 1),
                            energy_added_kwh=round(energy_added, 2),
                            duration_seconds=round(charge_time_seconds, 0),
                            estimated_cost_inr=round(energy_added * 20.0, 2) # Rough 20 INR per kWh
                        )
                    )
                    
                    # Update loop state
                    current_soc = target_soc
                    current_distance_km = breakdown.along_route_km
                    current_origin_name = best_station.name

        return TripPlanResponse(
            route=route,
            charging=charging,
            range_estimate=range_estimate,
            recommendation=recommendation,
            summary=TripSummary(
                distance_meters=route.distance_meters,
                duration_seconds=route.duration_seconds,
                charging_stations_found=len(charging.stations),
                filtered_stations=rec_telemetry.get("filtered_stations", 0),
                highest_score=rec_telemetry.get("highest_score", 0.0),
                average_score=rec_telemetry.get("average_score", 0.0),
                recommended_provider=rec_telemetry.get("recommended_provider"),
                recommendation_generation_time_ms=rec_telemetry.get("generation_time_ms", 0.0)
            ),
            itinerary=itinerary
        )
