from fastapi import APIRouter, HTTPException, Depends
from pydantic import ValidationError
import logging
from httpx import HTTPStatusError

from app.schemas.availability import ChargingAvailability, ChargingAvailabilityRequest
from app.services.availability_service import AvailabilityService

router = APIRouter(prefix="/availability", tags=["Availability"])
logger = logging.getLogger(__name__)

# Instantiate service once to preserve in-memory cache
availability_service = AvailabilityService()

@router.post("/fetch", response_model=ChargingAvailability)
async def fetch_availability(request: ChargingAvailabilityRequest):
    """
    Fetch real-time charging availability for a station.
    Accepts the provider metadata necessary to query the respective provider API.
    """
    try:
        availability = await availability_service.get_availability(request)
        return availability
    except ValueError as e:
        logger.warning(f"[availability_api] Validation/Routing error: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPStatusError as e:
        logger.error(f"[availability_api] Provider HTTP error: {e}")
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Live status not found on provider")
        elif e.response.status_code == 429:
            raise HTTPException(status_code=429, detail="Provider rate limit exceeded")
        raise HTTPException(status_code=502, detail="Provider temporarily unavailable")
    except Exception as e:
        logger.error(f"[availability_api] Unexpected error fetching availability: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching live status")
