import logging
from collections import OrderedDict
import urllib.parse
import httpx

from app.schemas.place import Place
from app.services.place_ranking_service import PlaceRankingService
from app.core.config import settings

logger = logging.getLogger(__name__)

class GeocodingError(Exception):
    pass

class GeocodingService:
    def __init__(self, cache_size: int = 100, ranking_service: PlaceRankingService | None = None) -> None:
        self._settings = settings
        self._cache: OrderedDict[str, list[Place]] = OrderedDict()
        self._cache_size = cache_size
        self._ranking_service = ranking_service or PlaceRankingService()

    def _get_from_cache(self, query: str) -> list[Place] | None:
        if query in self._cache:
            self._cache.move_to_end(query)
            return self._cache[query]
        return None

    def _add_to_cache(self, query: str, results: list[Place]) -> None:
        self._cache[query] = results
        self._cache.move_to_end(query)
        if len(self._cache) > self._cache_size:
            self._cache.popitem(last=False)

    async def search_places(self, query: str) -> list[Place]:
        query = query.strip()
        if len(query) < 3:
            return []

        cached = self._get_from_cache(query)
        if cached is not None:
            logger.debug("[geocoding] cache_hit query=%r", query)
            return cached

        logger.debug("[geocoding] cache_miss query=%r", query)
        
        # If no TomTom key, fallback to empty to avoid crashing (or we could fallback to Nominatim, but user prefers TomTom)
        if not self._settings.tom_tom_api_key:
            logger.warning("[geocoding] TomTom API key missing, returning empty places.")
            return []

        encoded_query = urllib.parse.quote(query)
        url = f"https://api.tomtom.com/search/2/search/{encoded_query}.json"

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(
                    url,
                    params={
                        "key": self._settings.tom_tom_api_key,
                        "limit": 5,
                        "typeahead": "true",
                        "language": "en-GB"
                    }
                )
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPError as e:
                logger.error("[geocoding] request_failed query=%r error=%s", query, str(e))
                raise GeocodingError("Failed to fetch places from TomTom") from e

            places = []
            for item in data.get("results", []):
                address = item.get("address", {})
                
                # Construct a clean display name
                display_parts = []
                if "freeformAddress" in address:
                    display_parts.append(address["freeformAddress"])
                if "country" in address and address["country"] not in display_parts[-1:]:
                    display_parts.append(address["country"])
                display_name = ", ".join(display_parts) or item.get("poi", {}).get("name") or "Unknown Place"

                places.append(
                    Place(
                        display_name=display_name,
                        latitude=item["position"]["lat"],
                        longitude=item["position"]["lon"],
                        osm_id=item.get("id"),
                        osm_type=item.get("type"),
                        importance=item.get("score"),
                        city=address.get("municipality") or address.get("localName"),
                        state=address.get("countrySubdivision"),
                        country=address.get("country"),
                    )
                )

            self._add_to_cache(query, places)
            return places
