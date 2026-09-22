"""
tests/test_openchargemap.py

Standalone verification script for the OpenChargeMap API.

Purpose:
    Confirm that the OCM provider is reachable, the API key is valid, and
    that EV charging data exists for a well-known Indian city (Bengaluru).

    This script has zero imports from the application. It is safe to run
    in any environment where httpx and python-dotenv are available.

Usage:
    # From the Backend directory:
    python tests/test_openchargemap.py

Exit codes:
    0  — success (API key valid, at least one station returned)
    1  — failure (connection error, auth failure, or zero stations)
"""

import json
import os
import sys
from pathlib import Path

import httpx

# ── Load API key from .env (one directory up from this file) ────────────────
env_path = Path(__file__).parent.parent / ".env"
api_key = ""

if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("OPENCHARGERMAP_API_KEY"):
            _, _, value = line.partition("=")
            api_key = value.strip().strip('"').strip("'")
            break

# Also accept the key from the environment (overrides .env)
api_key = os.environ.get("OPENCHARGERMAP_API_KEY", api_key)

# ── Query parameters ────────────────────────────────────────────────────────
# Bengaluru city centre — MG Road / Trinity Circle
LATITUDE = 12.9716
LONGITUDE = 77.5946
RADIUS_KM = 10
MAX_RESULTS = 10
OCM_URL = "https://api.openchargemap.io/v3/poi/"

PARAMS = {
    "output": "json",
    "latitude": LATITUDE,
    "longitude": LONGITUDE,
    "distance": RADIUS_KM,
    "distanceunit": "KM",
    "maxresults": MAX_RESULTS,
    "compact": "true",
    "verbose": "false",
}

HEADERS = {
    "User-Agent": "intelligent-ev-trip-planner-development",
    "X-Api-Key": api_key,
}

# ── Output ──────────────────────────────────────────────────────────────────
print("=" * 62)
print("  OpenChargeMap API — Verification Script")
print("=" * 62)
print(f"  Location  : Bengaluru city centre")
print(f"  Lat / Lon : {LATITUDE}, {LONGITUDE}")
print(f"  Radius    : {RADIUS_KM} km")
print(f"  API key   : {'SET (' + api_key[:6] + '...)' if api_key else 'NOT SET'}")
print()

if not api_key:
    print("[ERROR] OPENCHARGERMAP_API_KEY is not set.")
    print("        Add it to Backend/.env and re-run.")
    sys.exit(1)

# ── Fire the request ────────────────────────────────────────────────────────
try:
    with httpx.Client(timeout=15.0) as client:
        response = client.get(OCM_URL, params=PARAMS, headers=HEADERS)
except httpx.ConnectError as exc:
    print(f"[ERROR] Could not connect: {exc}")
    sys.exit(1)
except httpx.TimeoutException as exc:
    print(f"[ERROR] Request timed out: {exc}")
    sys.exit(1)

# ── HTTP status ─────────────────────────────────────────────────────────────
print(f"  HTTP status : {response.status_code}")
print(f"  Request URL : {response.url}")
print()

if response.status_code in (401, 403):
    print("[ERROR] Authentication failed.")
    print("        Check that OPENCHARGERMAP_API_KEY is correct in .env")
    sys.exit(1)

if response.status_code == 429:
    print("[WARN] Rate limited by OCM.")
    sys.exit(1)

if not response.is_success:
    print(f"[ERROR] Unexpected HTTP {response.status_code}")
    print(f"        Body: {response.text[:400]}")
    sys.exit(1)

# ── Parse body ──────────────────────────────────────────────────────────────
body = response.json()

if not isinstance(body, list):
    print(f"[ERROR] OCM returned a {type(body).__name__} instead of a list.")
    print(f"        Body preview: {str(body)[:400]}")
    sys.exit(1)

# ── Station count ───────────────────────────────────────────────────────────
station_count = len(body)
print(f"  Stations returned : {station_count}")

if station_count == 0:
    print()
    print("[INFO] Zero stations returned for this location / radius.")
    print("       OCM may have no data here, or the key lacks data access.")
    sys.exit(1)

# ── First station ───────────────────────────────────────────────────────────
first = body[0]
addr = first.get("AddressInfo") or {}
print(f"  First station     : {addr.get('Title', '(no name)')}")
print()
print("-" * 62)
print("  First station — raw JSON:")
print("-" * 62)
print(json.dumps(first, indent=2))

print()
print("[OK] OpenChargeMap API is working correctly.")
sys.exit(0)
