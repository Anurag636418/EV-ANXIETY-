import json
import os
import logging
from app.schemas.vehicle import EVVehicle

logger = logging.getLogger(__name__)

class VehicleDatabase:
    def __init__(self):
        self.vehicles: list[EVVehicle] = []
        self._load_data()

    def _load_data(self):
        try:
            # Assuming the JSON file is in app/data/ev_vehicles.json
            current_dir = os.path.dirname(os.path.abspath(__file__))
            data_file = os.path.join(current_dir, "..", "..", "data", "ev_vehicles.json")
            
            with open(data_file, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                self.vehicles = [EVVehicle(**item) for item in raw_data]
            logger.info(f"Loaded {len(self.vehicles)} EV vehicles from database.")
        except Exception as e:
            logger.error(f"Failed to load EV vehicle database: {e}")
            self.vehicles = []

    def get_vehicle(self, vehicle_id: str) -> EVVehicle | None:
        for v in self.vehicles:
            if v.id == vehicle_id:
                return v
        return None

    def get_all_vehicles(self) -> list[EVVehicle]:
        return self.vehicles
