class RecommendationService:
    """
    Placeholder for Sprint 6: AI-powered charger ranking and trip recommendations.

    Future capabilities (not yet implemented):
    - Rank charging stations by proximity, speed, availability, and user ratings
    - Suggest optimal charging stops based on vehicle battery state
    - Personalise recommendations using historical trip data
    - Integrate real-time charger availability feeds

    The interface is deliberately minimal so TripPlanningService can call it
    today and receive an empty list, and Sprint 6 can fill in the logic
    without changing the call site.
    """

    async def get_recommendations(self, context: dict) -> list:
        """
        Returns an empty list until Sprint 6 implements recommendation logic.

        Args:
            context: Dict containing at minimum 'route' (RouteResponse)
                     and 'charging' (ChargingResponse). Future stages may
                     add 'vehicle', 'user_preferences', etc.
        """
        return []
