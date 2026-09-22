import asyncio
import sys

from app.services.geocoding_service import GeocodingService
from app.services.place_ranking_service import PlaceRankingService

async def test_autocomplete():
    print("===================================================================")
    print("                  AUTOCOMPLETE VERIFICATION SUITE                  ")
    print("===================================================================")
    
    geocoder = GeocodingService(ranking_service=PlaceRankingService())
    
    test_cases = [
        {"query": "hyd", "expected_top_prefix": "Hyderabad"},
        {"query": "ban", "expected_top_prefix": "Bengaluru"},
        {"query": "ong", "expected_top_prefix": "Ongole"}
    ]
    
    failures = 0
    for case in test_cases:
        query = case["query"]
        expected = case["expected_top_prefix"]
        
        places = await geocoder.search_places(query)
        if not places:
            print(f"[FAIL] '{query}': Returned 0 results.")
            failures += 1
            continue
            
        top_place = places[0].display_name.split(",")[0].strip()
        
        if expected.lower() in top_place.lower():
            print(f"[PASS] '{query}' -> '{top_place}' (Expected: '{expected}')")
        else:
            print(f"[FAIL] '{query}' -> '{top_place}' (Expected: '{expected}')")
            failures += 1
            
    print("===================================================================")
    if failures == 0:
        print("All autocomplete tests PASSED.")
        return 0
    else:
        print(f"{failures} tests FAILED.")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(test_autocomplete()))
