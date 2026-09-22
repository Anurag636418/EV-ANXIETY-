import pytest
from app.services.range.range_service import RangeService, RangeEstimationError
from app.schemas.vehicle import VehicleInput

def test_range_service_normal_trip():
    service = RangeService()
    # 40 kWh battery, 15 kWh/100km efficiency, 80% SOC -> 32 kWh available
    # Trip is 100 km -> Needs 15 kWh
    # Remaining = 17 kWh -> 42.5% arrival SOC.
    
    vi = VehicleInput(
        battery_capacity_kwh=40.0,
        efficiency_kwh_per_100km=15.0,
        current_soc_percent=80.0
    )
    
    estimate = service.estimate_range(vi, 100_000.0) # 100km
    
    assert estimate.estimated_consumption_kwh == 15.0
    assert estimate.estimated_arrival_soc_percent == 42.5
    assert estimate.can_reach_destination is True
    assert estimate.charging_stops_needed == 0
    # Cost = 15.0 * 20.0 = 300.0
    assert estimate.estimated_cost_inr == 300.0

def test_range_service_0_soc():
    service = RangeService()
    vi = VehicleInput(
        battery_capacity_kwh=40.0,
        efficiency_kwh_per_100km=15.0,
        current_soc_percent=0.0
    )
    estimate = service.estimate_range(vi, 100_000.0)
    
    assert estimate.estimated_arrival_soc_percent == 0.0
    assert estimate.energy_shortfall_kwh == 15.0
    assert estimate.can_reach_destination is False
    assert estimate.charging_stops_needed > 0

def test_range_service_exceeding_range():
    service = RangeService()
    # Range is (40 * 1.0) / 15 * 100 = 266.6 km
    vi = VehicleInput(
        battery_capacity_kwh=40.0,
        efficiency_kwh_per_100km=15.0,
        current_soc_percent=100.0
    )
    estimate = service.estimate_range(vi, 400_000.0) # 400km
    
    assert estimate.can_reach_destination is False
    assert estimate.charging_stops_needed > 0

def test_range_service_invalid_input():
    service = RangeService()
    vi = VehicleInput(
        battery_capacity_kwh=0.0, # invalid
        efficiency_kwh_per_100km=15.0,
        current_soc_percent=100.0
    )
    with pytest.raises(RangeEstimationError):
        service.estimate_range(vi, 100_000.0)

def test_range_service_fallback_to_db():
    service = RangeService()
    # Assuming "tata_nexon_ev_45" is in the database with cap=45.0, eff=15.0
    vi = VehicleInput(
        vehicle_id="tata_nexon_ev_45",
        current_soc_percent=100.0
    )
    
    estimate = service.estimate_range(vi, 150_000.0) # 150km -> 22.5 kWh
    assert estimate.estimated_consumption_kwh == 22.5
    assert estimate.estimated_cost_inr == 450.0
