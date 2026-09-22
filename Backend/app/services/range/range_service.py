import logging
from app.schemas.vehicle import VehicleInput
from app.schemas.range_estimate import RangeEstimate
from app.services.range.vehicle_database import VehicleDatabase
from app.services.range.consumption_model import ConsumptionModel
from app.services.range.cost_estimator import CostEstimator

logger = logging.getLogger(__name__)

class RangeEstimationError(Exception):
    pass

class RangeService:
    def __init__(self):
        self.db = VehicleDatabase()
        self.consumption_model = ConsumptionModel()
        self.cost_estimator = CostEstimator()
        
    def estimate_range(self, vehicle_input: VehicleInput, distance_meters: float) -> RangeEstimate:
        logger.debug(
            "[range] estimating range for vehicle_id=%s distance_m=%s soc=%s",
            vehicle_input.vehicle_id, distance_meters, vehicle_input.current_soc_percent
        )
        
        cap = vehicle_input.battery_capacity_kwh
        eff = vehicle_input.efficiency_kwh_per_100km
        
        if vehicle_input.vehicle_id:
            vehicle = self.db.get_vehicle(vehicle_input.vehicle_id)
            if vehicle:
                cap = cap or vehicle.battery_capacity_kwh
                eff = eff or vehicle.efficiency_kwh_per_100km
            else:
                logger.warning(f"[range] Vehicle ID {vehicle_input.vehicle_id} not found in DB.")
                
        if cap is None or eff is None or cap <= 0 or eff <= 0:
            raise RangeEstimationError("Insufficient or invalid vehicle data (need positive battery capacity and efficiency).")
            
        try:
            consumption_data = self.consumption_model.estimate(
                distance_meters=distance_meters,
                efficiency_kwh_per_100km=eff,
                battery_capacity_kwh=cap,
                current_soc_percent=vehicle_input.current_soc_percent
            )
            
            cost_rate = 20.0 # Could load from settings.charging_cost_per_kwh if added
            cost = self.cost_estimator.estimate(consumption_data["estimated_consumption_kwh"], cost_rate)
            
            return RangeEstimate(
                estimated_range_km=consumption_data["estimated_range_km"],
                estimated_consumption_kwh=consumption_data["estimated_consumption_kwh"],
                estimated_arrival_soc_percent=consumption_data["estimated_arrival_soc_percent"],
                energy_shortfall_kwh=consumption_data["energy_shortfall_kwh"],
                can_reach_destination=consumption_data["can_reach_destination"],
                charging_stops_needed=consumption_data["charging_stops_needed"],
                estimated_cost_inr=cost,
                cost_rate_per_kwh=cost_rate,
                disclaimer="ESTIMATE ONLY. Based on published real-world averages and flat terrain. Does not read live vehicle BMS data."
            )
        except Exception as e:
            logger.error(f"[range] Failed to estimate range: {e}")
            raise RangeEstimationError(f"Failed to estimate range: {e}")
