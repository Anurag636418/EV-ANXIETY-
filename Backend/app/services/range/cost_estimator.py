class CostEstimator:
    def estimate(self, energy_kwh: float, rate_per_kwh: float = 20.0) -> float:
        """
        Estimates the cost of a trip based on consumed energy.
         rate_per_kwh defaults to 20.0 INR, representing an average public DC fast charger in India.
        """
        return max(0.0, energy_kwh * rate_per_kwh)
