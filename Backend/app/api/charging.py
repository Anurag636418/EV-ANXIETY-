from fastapi import APIRouter, HTTPException, status

from app.schemas.charging import ChargingRequest, ChargingResponse
from app.services.charging_service import ChargingDiscoveryError, ChargingService

router = APIRouter(prefix="/charging", tags=["charging"])

_charging_service = ChargingService()


@router.post("/stations", response_model=ChargingResponse)
async def find_charging_stations(request: ChargingRequest) -> ChargingResponse:
    """
    Discover EV charging stations along a route corridor.

    Accepts a GeoJSON coordinate list and a search radius. Returns all
    charging stations within that radius of sampled waypoints along the route.

    This endpoint exists as a standalone so it can be called independently
    of trip planning (e.g. for testing, partial workflows, or future
    mobile clients that manage routing separately).
    """
    try:
        return await _charging_service.find_stations_along_route(
            coordinates=request.coordinates,
            radius_km=request.radius_km,
        )
    except ChargingDiscoveryError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Charging data provider is unavailable",
        ) from error

