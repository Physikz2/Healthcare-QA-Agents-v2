# Healthcare QA Agents - FastAPI Endpoint Tests
# Purpose: Test REST endpoints, JWT authorization flow, and agent integration via HTTP.

import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def get_auth_headers() -> dict:
    """Helper function to fetch a demo JWT token and build authorization headers.

    Returns:
        Dict with Authorization Bearer header.
    """
    token_resp = client.post("/token", json={"username": "qa-tester", "role": "qa_lead"})
    assert token_resp.status_code == 200
    token = token_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_endpoint() -> None:
    """Test health check returns healthy status and active agents list."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "TriageAgent" in data["active_agents"]


def test_triage_unauthorized_without_token() -> None:
    """Test POST /triage rejects unauthenticated requests with HTTP 403 or 401."""
    payload = {"raw_log": "NullPointerException at PatientService.java:12"}
    response = client.post("/triage", json=payload)
    assert response.status_code in [401, 403]


def test_api_triage_and_assess_and_report_flow() -> None:
    """Test full authenticated HTTP workflow across /triage, /assess, and /report."""
    headers = get_auth_headers()

    # Step 1: POST /triage
    triage_req = {
        "raw_log": "TLSHandshakeException: Client transmitted ePHI over cleartext HTTP port 80",
        "test_suite": "security-transport",
        "test_case_id": "SEC-TLS-001"
    }
    triage_resp = client.post("/triage", json=triage_req, headers=headers)
    assert triage_resp.status_code == 200
    triage_data = triage_resp.json()
    assert triage_data["severity"] in ["HIGH", "CRITICAL"]
    assert "confidence" in triage_data

    # Step 2: POST /assess
    assess_resp = client.post("/assess", json=triage_data, headers=headers)
    assert assess_resp.status_code == 200
    policy_data = assess_resp.json()
    assert len(policy_data["matched_policies"]) >= 1

    # Step 3: POST /report
    report_req = {
        "triage_result": triage_data,
        "policy_assessment": policy_data
    }
    report_resp = client.post("/report", json=report_req, headers=headers)
    assert report_resp.status_code == 200
    report_data = report_resp.json()
    assert report_data["report_id"].startswith("QA-REP-")
    assert len(report_data["recommendations"]) >= 1
