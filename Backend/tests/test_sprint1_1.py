import pytest
from app.services.range.range_service import RangeService
from app.schemas.vehicle import VehicleInput
from app.services.range.consumption_model import ConsumptionModel
from app.services.trip_planning_service import TripPlanningService
from app.schemas.trip import TripPlanRequest
from app.schemas.place import Place

def test_s1_1_trip_shorter_than_available_range():
    # 40 kWh, 15 kWh/100km, 100% SOC -> 266 km range
    model = ConsumptionModel()
    res = model.estimate(100_000, 15.0, 40.0, 100.0)
    assert res["can_reach_destination"] is True
    assert res["estimated_range_km"] > 100.0

def test_s1_2_trip_longer_than_available_range():
    model = ConsumptionModel()
    res = model.estimate(400_000, 15.0, 40.0, 100.0)
    assert res["can_reach_destination"] is False
    assert res["estimated_range_km"] < 400.0

def test_s1_3_negative_raw_arrival_soc_handled():
    model = ConsumptionModel()
    res = model.estimate(400_000, 15.0, 40.0, 100.0)
    # Energy needed = 60kWh, Available = 40kWh, Shortfall = 20kWh
    assert res["energy_shortfall_kwh"] == 20.0
    
def test_s1_4_displayed_soc_never_below_0():
    model = ConsumptionModel()
    res = model.estimate(400_000, 15.0, 40.0, 100.0)
    assert res["estimated_arrival_soc_percent"] == 0.0

def test_s1_5_soc_never_above_100():
    model = ConsumptionModel()
    res = model.estimate(100_000, 15.0, 40.0, 150.0) # Assume someone passed 150
    # Available = 40 * 1.5 = 60
    # Needed = 15
    # Remaining = 45 -> raw SOC = 112.5%
    # Should clamp to 100%
    assert res["estimated_arrival_soc_percent"] == 100.0

@pytest.mark.asyncio
async def test_s1_6_to_9_trip_feasibility(monkeypatch):
    service = TripPlanningService()
    
    from app.schemas.route import RouteResponse, RouteGeometry, RoutePoint, ProviderMetadata
    from app.schemas.charging import ChargingResponse, ChargingSearchSummary, ChargingStation, ChargingProviderMetadata, ConnectorInfo
    
    def _rp(p):
        return RoutePoint(label=p.display_name, latitude=p.latitude, longitude=p.longitude) if p else RoutePoint(label="x", latitude=0.0, longitude=0.0)

    async def mock_plan_route(*args, **kwargs):
        return RouteResponse(
            origin=_rp(kwargs.get("origin")),
            destination=_rp(kwargs.get("destination")),
            provider=ProviderMetadata(name="mock", fetched_at="now", latency_ms=10.0),
            distance_meters=153000, # 153km
            duration_seconds=5000,
            geometry=RouteGeometry(type="LineString", coordinates=[[77.0, 12.0], [77.5, 12.5], [78.0, 13.0]])
        )
        
    async def mock_find_stations(*args, **kwargs):
        return ChargingResponse(
            stations=[
                ChargingStation(
                    id="station1", name="S1", latitude=12.5, longitude=77.5,
                    connectors=[ConnectorInfo(type_name="CCS2", power_kw=50)]
                )
            ],
            summary=ChargingSearchSummary(radius_km=10, waypoints_searched=3, total_found=1)
        )
        
    monkeypatch.setattr(service._routing, "plan_route", mock_plan_route)
    monkeypatch.setattr(service._charging, "find_stations_along_route", mock_find_stations)
    
    # 6. Station reachable, 8. Trip feasible after charging
    # 20 kWh, 15 kWh/100km, 100% SOC -> 133km range.
    # Trip = 153km. Not reachable directly.
    # Station at 76.5km. Reachable!
    # Remaining = 76.5km. Range at 80% (16kWh) = 106km. Feasible!
    req = TripPlanRequest(
        origin=Place(display_name="Origin", latitude=12.0, longitude=77.0),
        destination=Place(display_name="Dest", latitude=13.0, longitude=78.0),
        vehicle=VehicleInput(battery_capacity_kwh=20.0, efficiency_kwh_per_100km=15.0, current_soc_percent=100.0)
    )
    
    res = await service.plan_trip(req)
    assert res.range_estimate is not None
    assert res.range_estimate.can_reach_destination is False
    assert res.range_estimate.trip_feasible_with_charging == "YES"
    
    # 7. Station not reachable
    # 40 kWh, 15 kWh/100km, 50% SOC -> 133km range.
    # Station is at 161km. 161 > 133 (Not reachable!)
    req.vehicle.current_soc_percent = 50.0
    res = await service.plan_trip(req)
    assert res.range_estimate.trip_feasible_with_charging == "NO"
    
    # 9. Trip still infeasible after charging (needs multi-stop)
    # Trip is 500km. Station is at 161km. Remaining = 339km.
    # Range at 80% = 213km. 339 > 213 (Unknown / Needs 2+ stops)
    async def mock_plan_route_long(*args, **kwargs):
        return RouteResponse(
            origin=_rp(kwargs.get("origin")),
            destination=_rp(kwargs.get("destination")),
            provider=ProviderMetadata(name="mock", fetched_at="now", latency_ms=10.0),
            distance_meters=500000, 
            duration_seconds=20000,
            geometry=RouteGeometry(type="LineString", coordinates=[[77.0, 12.0], [77.5, 12.5], [78.0, 13.0]])
        )
    monkeypatch.setattr(service._routing, "plan_route", mock_plan_route_long)
    req.vehicle.current_soc_percent = 100.0 # Can reach station
    res = await service.plan_trip(req)
    assert res.range_estimate.trip_feasible_with_charging == "UNKNOWN"

@pytest.mark.asyncio
async def test_s1_10_existing_recommendation_functional(monkeypatch):
    # Ensure without vehicle, the recommendation still works fine.
    service = TripPlanningService()
    from app.schemas.route import RouteResponse, RouteGeometry, RoutePoint, ProviderMetadata
    from app.schemas.charging import ChargingResponse, ChargingSearchSummary, ChargingStation, ChargingProviderMetadata, ConnectorInfo
    
    def _rp(p):
        return RoutePoint(label=p.display_name, latitude=p.latitude, longitude=p.longitude) if p else RoutePoint(label="x", latitude=0.0, longitude=0.0)

    async def mock_plan_route(*args, **kwargs):
        return RouteResponse(
            origin=_rp(kwargs.get("origin")),
            destination=_rp(kwargs.get("destination")),
            provider=ProviderMetadata(name="mock", fetched_at="now", latency_ms=10.0),
            distance_meters=322000,
            duration_seconds=10000,
            geometry=RouteGeometry(type="LineString", coordinates=[[77.0, 12.0], [77.5, 12.5], [78.0, 13.0]])
        )
        
    async def mock_find_stations(*args, **kwargs):
        return ChargingResponse(
            stations=[
                ChargingStation(
                    id="station1", name="S1", latitude=12.5, longitude=77.5,
                    connectors=[ConnectorInfo(type_name="CCS2", power_kw=150)]
                )
            ],
            summary=ChargingSearchSummary(radius_km=10, waypoints_searched=3, total_found=1)
        )
    monkeypatch.setattr(service._routing, "plan_route", mock_plan_route)
    monkeypatch.setattr(service._charging, "find_stations_along_route", mock_find_stations)
    
    req = TripPlanRequest(
        origin=Place(display_name="Origin", latitude=12.0, longitude=77.0),
        destination=Place(display_name="Dest", latitude=13.0, longitude=78.0)
    )
    res = await service.plan_trip(req)
    assert res.range_estimate is None
    assert res.recommendation is not None
    assert res.recommendation.recommended_station.name == "S1"
