import httpx
from fastapi import APIRouter, HTTPException, status

from app.schemas.trip import TripPlanRequest, TripPlanResponse
from app.services.routing_service import RoutePlanningError
from app.services.trip_planning_service import TripPlanningService

router = APIRouter(prefix="/trip", tags=["trip"])

_trip_planning_service = TripPlanningService()


@router.post("/plan", response_model=TripPlanResponse)
async def plan_trip(request: TripPlanRequest) -> TripPlanResponse:
    """
    Plan a complete EV trip.

    Orchestrates routing + charging station discovery in a single request.
    The response includes the full route geometry, all charging stations
    found along the corridor, a summary, and a placeholder recommendations
    list (populated in Sprint 6).

    This is the primary endpoint for the frontend. The standalone
    ``POST /charging/stations`` endpoint remains available for direct use.
    """
    try:
        return await _trip_planning_service.plan_trip(request)
    except RoutePlanningError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="An upstream provider is unavailable. Please try again.",
        ) from error
