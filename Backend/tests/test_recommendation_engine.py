import pytest
from app.schemas.charging import ChargingStation, ConnectorInfo, ChargingProviderMetadata
from app.services.charging.eligibility_filter import EligibilityFilter
from app.services.charging.scoring_service import ChargingScoringService
from app.services.charging.recommendation_service import ChargingRecommendationService

def test_eligibility_filter_removes_too_far():
    filter_svc = EligibilityFilter()
    filter_svc.max_detour_km = 5.0
    
    route = [[0.0, 0.0]]
    # Station far away (approx 10 degrees is way more than 5km)
    s_far = ChargingStation(id="1", name="Far", latitude=10.0, longitude=10.0, connectors=[ConnectorInfo(type_name="CSS", power_kw=50)])
    s_near = ChargingStation(id="2", name="Near", latitude=0.01, longitude=0.01, connectors=[ConnectorInfo(type_name="CSS", power_kw=50)])
    
    eligible, count = filter_svc.filter_stations([s_far, s_near], route)
    assert len(eligible) == 1
    assert eligible[0].id == "2"
    assert count == 1

def test_eligibility_filter_requires_connectors():
    filter_svc = EligibilityFilter()
    route = [[0.0, 0.0]]
    
    s_empty = ChargingStation(id="1", name="Empty", latitude=0.0, longitude=0.0, connectors=[])
    s_valid = ChargingStation(id="2", name="Valid", latitude=0.0, longitude=0.0, connectors=[ConnectorInfo(type_name="CSS", power_kw=50)])
    
    eligible, count = filter_svc.filter_stations([s_empty, s_valid], route)
    assert len(eligible) == 1
    assert eligible[0].id == "2"
    assert count == 1

def test_scoring_prefers_higher_power():
    scorer = ChargingScoringService()
    route = [[0.0, 0.0]]
    
    # Same location, different power
    s_slow = ChargingStation(id="1", name="Slow", latitude=0.0, longitude=0.0, connectors=[ConnectorInfo(type_name="CSS", power_kw=50)])
    s_fast = ChargingStation(id="2", name="Fast", latitude=0.0, longitude=0.0, connectors=[ConnectorInfo(type_name="CSS", power_kw=150)])
    
    b_slow = scorer.score_station(s_slow, route)
    b_fast = scorer.score_station(s_fast, route)
    
    assert b_fast.power_score > b_slow.power_score
    assert b_fast.total_score > b_slow.total_score

def test_scoring_prefers_trusted_operators():
    scorer = ChargingScoringService()
    scorer.preferred_ops = ["tata power"]
    route = [[0.0, 0.0]]
    
    # Same location and power, different operator
    s_untrusted = ChargingStation(id="1", name="Untrusted", latitude=0.0, longitude=0.0, operator="Unknown", connectors=[ConnectorInfo(type_name="CSS", power_kw=50)])
    s_trusted = ChargingStation(id="2", name="Trusted", latitude=0.0, longitude=0.0, operator="Tata Power", connectors=[ConnectorInfo(type_name="CSS", power_kw=50)])
    
    b_untrusted = scorer.score_station(s_untrusted, route)
    b_trusted = scorer.score_station(s_trusted, route)
    
    assert b_trusted.operator_score > b_untrusted.operator_score
    assert b_trusted.total_score > b_untrusted.total_score

def test_recommendation_pipeline():
    rec_svc = ChargingRecommendationService()
    
    route = [[0.0, 0.0]]
    stations = [
        ChargingStation(id="1", name="Perfect", latitude=0.0, longitude=0.0, operator="Tata Power", connectors=[ConnectorInfo(type_name="CSS", power_kw=150), ConnectorInfo(type_name="CSS", power_kw=150)], provider_metadata=ChargingProviderMetadata(provider="TomTom", provider_version="1", provider_station_id="1", fetched_at="", latency_ms=0)),
        ChargingStation(id="2", name="Good", latitude=0.01, longitude=0.01, operator="ChargeZone", connectors=[ConnectorInfo(type_name="CSS", power_kw=50)], provider_metadata=ChargingProviderMetadata(provider="TomTom", provider_version="1", provider_station_id="2", fetched_at="", latency_ms=0)),
        ChargingStation(id="3", name="Bad", latitude=10.0, longitude=10.0, operator="Unknown", connectors=[ConnectorInfo(type_name="CSS", power_kw=10)], provider_metadata=ChargingProviderMetadata(provider="TomTom", provider_version="1", provider_station_id="3", fetched_at="", latency_ms=0)),
        ChargingStation(id="4", name="Okay", latitude=0.02, longitude=0.02, operator="Unknown", connectors=[ConnectorInfo(type_name="CSS", power_kw=25)], provider_metadata=ChargingProviderMetadata(provider="TomTom", provider_version="1", provider_station_id="4", fetched_at="", latency_ms=0)),
    ]
    
    recommendation, telemetry = rec_svc.recommend(stations, route)
    
    assert recommendation is not None
    assert recommendation.recommended_station is not None
    assert recommendation.recommended_station.id == "1"
    assert len(recommendation.alternative_stations) == 2 # 3 was filtered out, so 1 winner + 2 alternatives
    assert telemetry["filtered_stations"] == 1
    
    reasons = recommendation.recommendation_reason
    assert any("ultra-fast" in r for r in reasons)
    assert any("route" in r for r in reasons)
