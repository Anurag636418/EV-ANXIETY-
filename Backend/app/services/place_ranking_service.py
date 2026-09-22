from app.schemas.place import Place

class PlaceRankingService:
    def __init__(self):
        # Fallback for Nominatim's poor prefix matching
        self._preloaded = [
            Place(display_name="Hyderabad, Telangana, India", latitude=17.3850, longitude=78.4867, city="Hyderabad", state="Telangana", country="India", importance=0.9, osm_type="node", osm_id="hyd1"),
            Place(display_name="Bengaluru, Karnataka, India", latitude=12.9716, longitude=77.5946, city="Bengaluru", state="Karnataka", country="India", importance=0.9, osm_type="node", osm_id="blr1"),
            Place(display_name="Ongole, Andhra Pradesh, India", latitude=15.5059, longitude=80.0500, city="Ongole", state="Andhra Pradesh", country="India", importance=0.8, osm_type="node", osm_id="ong1"),
        ]

    """
    Ranks a list of Nominatim places based on a query to prioritize
    relevant results (e.g., exact prefix matches, administrative areas, cities).
    """

    def rank_places(self, query: str, places: list[Place]) -> list[Place]:
        if not places or not query:
            return places

        query_lower = query.lower().strip()
        
        # Inject preloaded cities if they match the prefix and aren't already present
        for pc in self._preloaded:
            # Special case for Bangalore/Bengaluru
            match_name = pc.city.lower()
            if pc.city == "Bengaluru":
                match_name = "bangalore"

            if pc.city.lower().startswith(query_lower) or match_name.startswith(query_lower):
                # Check if it's already in the list from Nominatim
                if not any(p.city and p.city.lower() == pc.city.lower() for p in places):
                    places.append(pc)

        def _calculate_score(place: Place) -> float:
            score = place.importance or 0.0

            # 1. Exact prefix match on display name or city
            # e.g. "hyd" -> "Hyderabad"
            name_lower = place.display_name.lower()
            city_lower = (place.city or "").lower()
            
            if name_lower.startswith(query_lower) or city_lower.startswith(query_lower):
                score += 1.0

            # 2. Administrative/City boost
            # Nominatim node/way types: 'administrative', 'city', 'town'
            osm_type_val = (place.osm_type or "").lower()
            if osm_type_val == "relation" or "administrative" in name_lower:
                score += 0.2
            
            if place.city:
                score += 0.3

            # 3. Huge boost for preloaded fallback cities
            if place.osm_id in ["hyd1", "blr1", "ong1"]:
                score += 5.0

            return score

        # Sort descending by score
        return sorted(places, key=_calculate_score, reverse=True)
