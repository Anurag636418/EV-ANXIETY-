from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.place import PlaceSearchResponse
from app.services.geocoding_service import GeocodingError, GeocodingService

router = APIRouter(prefix="/places", tags=["places"])

# Singleton service instance
_geocoding_service = GeocodingService()

@router.get("/search", response_model=PlaceSearchResponse)
async def search_places(
    q: str = Query(..., min_length=3, description="Place search query")
) -> PlaceSearchResponse:
    try:
        places = await _geocoding_service.search_places(q)
        return PlaceSearchResponse(results=places)
    except GeocodingError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding service unavailable",
        ) from error
