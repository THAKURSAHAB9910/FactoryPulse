"""
Unit Tests for Incident Workflow State Machine
"""

import pytest
import uuid
from datetime import datetime, timezone
from backend.app.models.incident import Incident, IncidentStatus, AlertSeverity

def test_incident_state_transitions():
    inc = Incident(
        incident_id=uuid.uuid4(),
        machine_id="MCH-01-01",
        rule_name="High Bearing Vibration",
        metric_name="VIBRATION_RMS",
        observed_value=5.8,
        threshold_value=4.5,
        severity=AlertSeverity.CRITICAL,
        status=IncidentStatus.OPEN
    )
    
    assert inc.status == IncidentStatus.OPEN
    assert inc.acknowledged_at is None
    assert inc.resolved_at is None
    
    # 1. Acknowledge
    user_ack_id = uuid.uuid4()
    inc.status = IncidentStatus.ACKNOWLEDGED
    inc.acknowledged_at = datetime.now(timezone.utc)
    inc.acknowledged_by = user_ack_id
    
    assert inc.status == IncidentStatus.ACKNOWLEDGED
    assert inc.acknowledged_by == user_ack_id
    assert inc.acknowledged_at is not None
    
    # 2. Investigate
    inc.status = IncidentStatus.INVESTIGATING
    inc.root_cause = "Loss of lubricant in bearing housing causing excessive friction."
    assert inc.status == IncidentStatus.INVESTIGATING
    assert "lubricant" in inc.root_cause
    
    # 3. Resolve
    user_res_id = uuid.uuid4()
    inc.status = IncidentStatus.RESOLVED
    inc.corrective_action = "Flushed housing, replaced bearing seals, and replenished synthetic grease."
    inc.resolved_at = datetime.now(timezone.utc)
    inc.resolved_by = user_res_id
    
    assert inc.status == IncidentStatus.RESOLVED
    assert inc.resolved_at is not None
    assert inc.resolved_by == user_res_id
    assert "grease" in inc.corrective_action
