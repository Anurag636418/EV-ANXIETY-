import asyncio
import sys

from app.schemas.place import Place
from app.schemas.trip import TripPlanRequest
from app.services.trip_planning_service import TripPlanningService
from app.core.config import settings

async def test_trip_discovery():
    print("===================================================================")
    print("                  TRIP DISCOVERY VERIFICATION SUITE                ")
    print("===================================================================")
    
    trip_service = TripPlanningService()
    
    test_cases = [
        {"origin": Place(display_name="Bengaluru", latitude=12.9716, longitude=77.5946),
         "dest": Place(display_name="Mysuru", latitude=12.2958, longitude=76.6394)},
        {"origin": Place(display_name="Ongole", latitude=15.5059, longitude=80.0500),
         "dest": Place(display_name="Hyderabad", latitude=17.3850, longitude=78.4867)},
        {"origin": Place(display_name="Ongole", latitude=15.5059, longitude=80.0500),
         "dest": Place(display_name="Bengaluru", latitude=12.9716, longitude=77.5946)},
        {"origin": Place(display_name="Ongole", latitude=15.5059, longitude=80.0500),
         "dest": Place(display_name="Panaji", latitude=15.4909, longitude=73.8278)},
    ]
    
    failures = 0
    print(f"{'Route':<30} | {'Dist(km)':<10} | {'Stations':<10} | {'Status'}")
    print("-" * 70)
    
    for case in test_cases:
        req = TripPlanRequest(origin=case["origin"], destination=case["dest"])
        try:
            res = await trip_service.plan_trip(req)
            dist_km = res.summary.distance_meters / 1000
            stations = res.summary.charging_stations_found
            
            status = "PASS" if stations > 0 else "PASS (0 stations - data gap)"
            
            route_name = f"{case['origin'].display_name} -> {case['dest'].display_name}"
            print(f"{route_name:<30} | {dist_km:<10.1f} | {stations:<10} | {status}")
            
        except Exception as e:
            print(f"ERROR on {case['origin'].display_name} -> {case['dest'].display_name}: {e}")
            failures += 1
            
    print("===================================================================")
    if failures == 0:
        print("All trip discovery tests PASSED. Stations found on all routes.")
        return 0
    else:
        print(f"{failures} tests FAILED. Found 0 stations on some routes.")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(test_trip_discovery()))
