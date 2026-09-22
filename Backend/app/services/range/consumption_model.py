class ConsumptionModel:
    def estimate(
        self, 
        distance_meters: float, 
        efficiency_kwh_per_100km: float, 
        battery_capacity_kwh: float, 
        current_soc_percent: float
    ) -> dict:
        distance_km = distance_meters / 1000.0
        
        # Energy required for this exact trip length
        energy_needed_kwh = distance_km * (efficiency_kwh_per_100km / 100.0)
        
        # Energy currently in the battery
        available_energy_kwh = battery_capacity_kwh * (current_soc_percent / 100.0)
        
        # Estimated absolute range based on current SOC
        estimated_range_km = 0.0
        if efficiency_kwh_per_100km > 0:
            estimated_range_km = (available_energy_kwh / efficiency_kwh_per_100km) * 100.0
            
        remaining_energy_kwh = available_energy_kwh - energy_needed_kwh
        energy_shortfall_kwh = max(0.0, -remaining_energy_kwh)
        
        raw_soc = (remaining_energy_kwh / battery_capacity_kwh) * 100.0 if battery_capacity_kwh > 0 else 0.0
        estimated_arrival_soc_percent = max(0.0, min(100.0, raw_soc))
            
        # We assume reachable if we arrive with at least 10% SOC margin
        can_reach_destination = estimated_arrival_soc_percent >= 10.0
        
        # Super basic proxy for charging stops: if we can't reach it, we need at least 1 stop
        charging_stops_needed = 0 if can_reach_destination else max(1, int(distance_km // (battery_capacity_kwh / (efficiency_kwh_per_100km / 100.0) * 0.8)))
        
        return {
            "estimated_range_km": max(0.0, estimated_range_km),
            "estimated_consumption_kwh": max(0.0, energy_needed_kwh),
            "estimated_arrival_soc_percent": estimated_arrival_soc_percent,
            "energy_shortfall_kwh": energy_shortfall_kwh,
            "can_reach_destination": can_reach_destination,
            "charging_stops_needed": charging_stops_needed
        }
