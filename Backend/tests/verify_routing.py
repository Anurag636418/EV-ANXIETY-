"""
tests/verify_routing.py

Routing Verification Framework -- Sprint 2.1

Diagnoses routing accuracy by inspecting every stage of the pipeline:
    Step 1: Original user input
    Step 2: Geocoding responses (Nominatim)
    Step 3: Routing request (OSRM URL + coordinate order)
    Step 4: Routing response (distance, duration, geometry)
    Step 5: Verification against expected distances

This script has ZERO imports from the application. It reproduces the
same logic as RoutingService using raw HTTP calls so we can inspect
every intermediate value without the app's abstractions hiding anything.

Usage:
    cd Backend
    .venv\\Scripts\\python.exe tests/verify_routing.py
"""

import json
import sys
from urllib.parse import quote

import httpx

# -- Constants ---------------------------------------------------------------
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving"
USER_AGENT = "intelligent-ev-trip-planner-development"
TIMEOUT = 20.0

# -- Test cases --------------------------------------------------------------
# expected_km is the approximate driving distance (Google Maps reference)
TEST_CASES = [
    {"origin": "Bengaluru",  "destination": "Mysuru",      "expected_km": 150},
    {"origin": "Ongole",     "destination": "Nellore",     "expected_km": 160},
    {"origin": "Ongole",     "destination": "Vijayawada",  "expected_km": 310},
    {"origin": "Ongole",     "destination": "Hyderabad",   "expected_km": 370},
    {"origin": "Ongole",     "destination": "Bengaluru",   "expected_km": 580},
    {"origin": "Ongole",     "destination": "Goa",         "expected_km": 840},
]

# How far off actual can be before we flag a failure (percentage)
TOLERANCE_PERCENT = 25


# -- Helpers -----------------------------------------------------------------
def section(title: str) -> None:
    print()
    print(f"  {'-' * 60}")
    print(f"  {title}")
    print(f"  {'-' * 60}")


def geocode(client: httpx.Client, query: str) -> dict:
    """
    Call Nominatim, return the FULL raw JSON for the first result.
    """
    response = client.get(
        NOMINATIM_URL,
        params={"q": query, "format": "jsonv2", "limit": 1},
        headers={"User-Agent": USER_AGENT},
    )
    response.raise_for_status()
    results = response.json()
    if not results:
        return {"error": f"No results for '{query}'"}
    return results[0]


def route(client: httpx.Client, origin: dict, destination: dict) -> dict:
    """
    Call OSRM with origin/destination dicts that have 'lat' and 'lon' keys.
    Returns the full raw JSON payload + the constructed URL.
    """
    o_lat, o_lon = float(origin["lat"]), float(origin["lon"])
    d_lat, d_lon = float(destination["lat"]), float(destination["lon"])

    # OSRM expects: longitude,latitude
    coordinates = f"{o_lon},{o_lat};{d_lon},{d_lat}"
    encoded = quote(coordinates, safe=",;")
    url = f"{OSRM_BASE_URL}/{encoded}"

    response = client.get(
        url,
        params={"overview": "full", "geometries": "geojson", "steps": "false"},
    )
    response.raise_for_status()
    payload = response.json()
    payload["_constructed_url"] = str(response.url)
    return payload


# -- Main --------------------------------------------------------------------
def run_single_test(client: httpx.Client, test: dict, index: int) -> dict:
    """
    Run one test case through all 4 pipeline stages and return a summary dict.
    """
    origin_name = test["origin"]
    dest_name = test["destination"]
    expected_km = test["expected_km"]

    print()
    print("=" * 64)
    print(f"  TEST {index}: {origin_name} -> {dest_name}")
    print(f"  Expected: ~{expected_km} km")
    print("=" * 64)

    # -- STEP 1: Original user input ------------------------------------
    section("STEP 1 -- Original User Input")
    print(f"  Origin      : {origin_name!r}")
    print(f"  Destination : {dest_name!r}")

    # -- STEP 2: Geocoding ----------------------------------------------
    section("STEP 2 -- Geocoding Responses")

    origin_geo = geocode(client, origin_name)
    if "error" in origin_geo:
        print(f"  [FAIL] Origin geocoding: {origin_geo['error']}")
        return {"test": f"{origin_name}->{dest_name}", "status": "GEOCODE_FAIL"}

    dest_geo = geocode(client, dest_name)
    if "error" in dest_geo:
        print(f"  [FAIL] Destination geocoding: {dest_geo['error']}")
        return {"test": f"{origin_name}->{dest_name}", "status": "GEOCODE_FAIL"}

    for label, geo in [("ORIGIN", origin_geo), ("DESTINATION", dest_geo)]:
        print()
        print(f"  {label}:")
        print(f"    Display Name : {geo.get('display_name', 'N/A')}")
        print(f"    Latitude     : {geo.get('lat')}")
        print(f"    Longitude    : {geo.get('lon')}")
        print(f"    Place ID     : {geo.get('place_id', 'N/A')}")
        print(f"    OSM Type     : {geo.get('osm_type', 'N/A')}")
        print(f"    Category     : {geo.get('category', 'N/A')}")
        print(f"    Type         : {geo.get('type', 'N/A')}")
        print()
        print(f"    Raw JSON:")
        print(f"    {json.dumps(geo, indent=6)}")

    # -- STEP 3: Routing request ----------------------------------------
    section("STEP 3 -- Routing Request")

    o_lat, o_lon = float(origin_geo["lat"]), float(origin_geo["lon"])
    d_lat, d_lon = float(dest_geo["lat"]), float(dest_geo["lon"])

    print(f"  Origin coords     : lat={o_lat}, lon={o_lon}")
    print(f"  Destination coords: lat={d_lat}, lon={d_lon}")
    print()
    print(f"  OSRM expects: longitude,latitude")
    print(f"  Constructed  : {o_lon},{o_lat};{d_lon},{d_lat}")
    print()

    # Verify coordinate order sanity:
    # Indian longitudes are 68–97; latitudes are 8–37.
    for name, lat, lon in [("Origin", o_lat, o_lon), ("Destination", d_lat, d_lon)]:
        lat_ok = 6 <= lat <= 38
        lon_ok = 66 <= lon <= 98
        if not lat_ok or not lon_ok:
            print(f"  [WARN] {name} coords look suspicious!")
            print(f"         lat={lat} (expected 6–38 for India)")
            print(f"         lon={lon} (expected 66–98 for India)")
            print(f"         Possible lat/lon swap?")
        else:
            print(f"  [OK] {name} coords within India bounds")

    routing_result = route(client, origin_geo, dest_geo)
    print()
    print(f"  Full OSRM URL: {routing_result.get('_constructed_url', 'N/A')}")

    # -- STEP 4: Routing response ---------------------------------------
    section("STEP 4 -- Routing Response")

    if routing_result.get("code") != "Ok" or not routing_result.get("routes"):
        print(f"  [FAIL] OSRM returned code={routing_result.get('code')}")
        print(f"  Raw response: {json.dumps(routing_result, indent=4)[:500]}")
        return {"test": f"{origin_name}->{dest_name}", "status": "ROUTING_FAIL"}

    r = routing_result["routes"][0]
    actual_km = r["distance"] / 1000
    duration_min = r["duration"] / 60
    geom_points = len(r.get("geometry", {}).get("coordinates", []))

    print(f"  Distance        : {actual_km:,.1f} km ({r['distance']:,.0f} m)")
    print(f"  Duration        : {duration_min:,.0f} min ({r['duration']:,.0f} s)")
    print(f"  Geometry points : {geom_points}")

    # Log waypoint information from OSRM
    waypoints = routing_result.get("waypoints", [])
    if waypoints:
        print()
        print(f"  OSRM Waypoints ({len(waypoints)}):")
        for i, wp in enumerate(waypoints):
            wp_loc = wp.get("location", [None, None])
            print(f"    [{i}] name={wp.get('name', 'N/A')!r}  "
                  f"location=[{wp_loc[0]}, {wp_loc[1]}]  "
                  f"hint={wp.get('hint', 'N/A')[:30]}...")

    # -- Comparison -----------------------------------------------------
    diff_km = actual_km - expected_km
    diff_pct = (diff_km / expected_km) * 100 if expected_km else 0

    print()
    print(f"  Expected : ~{expected_km} km")
    print(f"  Actual   :  {actual_km:,.1f} km")
    print(f"  Diff     :  {diff_km:+,.1f} km  ({diff_pct:+.1f}%)")

    if abs(diff_pct) > TOLERANCE_PERCENT:
        print(f"  [FAIL] Distance is off by {abs(diff_pct):.0f}% (tolerance: {TOLERANCE_PERCENT}%)")
        status = "FAIL"
    else:
        print(f"  [PASS]")
        status = "PASS"

    return {
        "test": f"{origin_name} -> {dest_name}",
        "expected_km": expected_km,
        "actual_km": round(actual_km, 1),
        "diff_km": round(diff_km, 1),
        "diff_pct": round(diff_pct, 1),
        "status": status,
        "origin_display": origin_geo.get("display_name", ""),
        "dest_display": dest_geo.get("display_name", ""),
    }


def main() -> None:
    print()
    print("+" + "=" * 62 + "+")
    print("|         ROUTING VERIFICATION FRAMEWORK -- Sprint 2.1         |")
    print("+" + "=" * 62 + "+")

    results = []

    with httpx.Client(timeout=TIMEOUT) as client:
        for i, test in enumerate(TEST_CASES, start=1):
            result = run_single_test(client, test, i)
            results.append(result)

    # -- STEP 5: Summary report -----------------------------------------
    print()
    print()
    print("+" + "=" * 62 + "+")
    print("|                    VERIFICATION SUMMARY                      |")
    print("+" + "=" * 62 + "+")
    print()

    header = f"  {'Route':<30} {'Expected':>10} {'Actual':>10} {'Diff':>12} {'Status':>8}"
    separator = f"  {'-' * 30} {'-' * 10} {'-' * 10} {'-' * 12} {'-' * 8}"
    print(header)
    print(separator)

    failures = []
    for r in results:
        if "actual_km" not in r:
            print(f"  {r['test']:<30} {'--':>10} {'--':>10} {'--':>12} {r['status']:>8}")
            failures.append(r)
            continue

        status_label = r["status"]
        line = (
            f"  {r['test']:<30} "
            f"{r['expected_km']:>8} km "
            f"{r['actual_km']:>8} km "
            f"{r['diff_km']:>+8} km "
            f"{status_label:>8}"
        )
        print(line)
        if status_label == "FAIL":
            failures.append(r)

    print()
    passed = sum(1 for r in results if r.get("status") == "PASS")
    total = len(results)
    print(f"  Passed: {passed}/{total}")

    if failures:
        print()
        print("  FAILURES:")
        for f in failures:
            print(f"    • {f['test']}")
            if "diff_pct" in f:
                print(f"      Off by {f['diff_pct']:+.1f}% ({f['diff_km']:+.1f} km)")
            if "origin_display" in f:
                print(f"      Origin resolved to: {f['origin_display']}")
            if "dest_display" in f:
                print(f"      Destination resolved to: {f['dest_display']}")

    # -- Diagnostic hints -----------------------------------------------
    print()
    print(f"  {'-' * 60}")
    print("  DIAGNOSTIC NOTES")
    print(f"  {'-' * 60}")
    print()
    print("  If ALL tests fail with distances ~6x too large:")
    print("    -> Likely a lat/lon swap (OSRM gets lat,lon instead of lon,lat)")
    print()
    print("  If only SOME tests fail:")
    print("    -> Likely a geocoding issue (city resolves to wrong place)")
    print()
    print("  If distances are slightly off but reasonable:")
    print("    -> Normal OSRM vs Google Maps routing differences")
    print()
    print("  If OSRM waypoint names are blank or wrong:")
    print("    -> The snapped start/end is far from the geocoded point")

    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
