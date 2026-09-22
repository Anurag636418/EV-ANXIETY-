from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Intelligent EV Trip Planner API"
    app_env: str = "development"
    frontend_origins: str = "http://localhost:3000,http://localhost:3001"

    # Charging station discovery
    # OCM works without a key at low request volume; set one for higher limits.
    # Get a free key at https://openchargemap.org/site/develop/api
    openchargermap_api_key: str = ""
    tom_tom_api_key: str = ""
    
    # Provider selection: "tomtom" (primary with OCM fallback), "openchargemap", or "both"
    charging_provider: str = "tomtom"
    
    # Distance threshold in meters for deduplicating charging stations
    charging_dedup_distance_meters: float = 25.0
    
    # Default search radius around each sampled waypoint (km)
    charging_search_radius_km: float = 25.0
    # Maximum number of waypoints to sample from the route.
    charging_max_waypoints: int = 15

    # Recommendation Engine Config
    charging_weight_distance: float = 0.40
    charging_weight_power: float = 0.30
    charging_weight_operator: float = 0.20
    charging_weight_connectors: float = 0.10
    charging_preferred_operators: str = "Tata Power,ChargeZone,Jio-bp,Zeon,Statiq"
    charging_max_detour_km: float = 10.0

    # Availability Config
    availability_cache_ttl_seconds: int = 120

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]


settings = Settings()

