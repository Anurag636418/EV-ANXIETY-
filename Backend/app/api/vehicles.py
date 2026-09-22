from fastapi import APIRouter
from app.schemas.vehicle import EVVehicle
from app.services.range.vehicle_database import VehicleDatabase

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

# A single global instance to avoid reloading JSON on every request
vehicle_db = VehicleDatabase()

@router.get("", response_model=list[EVVehicle])
async def list_vehicles():
    """
    Returns the list of supported EV vehicles.
    """
    return vehicle_db.get_all_vehicles()
