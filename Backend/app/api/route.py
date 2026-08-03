import httpx
from fastapi import APIRouter, HTTPException, status

from app.schemas.route import RouteRequest, RouteResponse
from app.services.routing_service import RoutePlanningError, RoutingService

router = APIRouter(tags=["route"])
routing_service = RoutingService()


@router.post("/route", response_model=RouteResponse)
async def plan_route(route_request: RouteRequest) -> RouteResponse:
    try:
        return await routing_service.plan_route(
            origin=route_request.origin,
            destination=route_request.destination,
        )
    except RoutePlanningError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Routing provider is unavailable",
        ) from error
