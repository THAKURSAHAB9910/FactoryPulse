"""
Unit Tests for Alert Rules Models and Schema Validation
"""

import pytest
import uuid
from backend.app.schemas.alert_rule import AlertRuleCreate, AlertRuleResponse

def test_alert_rule_schema_validation():
    rule_data = {
        "rule_name": "Hydraulic Pressure Drop",
        "metric_name": "PRESSURE_BAR",
        "comparison_operator": "<",
        "threshold_value": 150.0,
        "severity": "CRITICAL",
        "machine_type": "HYDRAULIC_PRESS",
        "is_active": True,
        "description": "Main accumulator pressure drop"
    }
    
    rule = AlertRuleCreate(**rule_data)
    assert rule.metric_name == "PRESSURE_BAR"
    assert rule.threshold_value == 150.0
    assert rule.severity == "CRITICAL"
    assert rule.is_active is True
