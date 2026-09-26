# Healthcare QA Agents - Agent Unit and Pipeline Tests
# Purpose: Verify multi-agent orchestration, guardrails, confidence scoring, and human review routing.

import pytest
from agents.policy_agent import run_policy_agent
from agents.report_agent import run_report_agent
from agents.triage_agent import run_triage_agent
from models.schemas import (
    FailureCategory,
    ParsedLogDetails,
    SeverityLevel,
    TestFailureInput,
    TriageResult,
)


def test_triage_agent_guardrail_validates_input() -> None:
    """Test triage_agent rejects empty input payloads with ValueError."""
    empty_input = TestFailureInput(raw_log=None, structured_data=None)
    with pytest.raises(ValueError, match="must contain either raw_log or structured_data"):
        run_triage_agent(empty_input)


def test_triage_agent_fhir_failure() -> None:
    """Test triage_agent processes a FHIR consent failure properly."""
    failure = TestFailureInput(
        raw_log="403 Forbidden: Missing patient consent for FHIR resource Observation/10928",
        test_suite="fhir-consent-suite",
        test_case_id="TC-FHIR-401"
    )
    result = run_triage_agent(failure)
    assert result.severity in [SeverityLevel.HIGH, SeverityLevel.MEDIUM]
    assert result.category == FailureCategory.FHIR_COMPLIANCE
    assert result.confidence > 0.70
    assert len(result.summary) >= 10


def test_policy_agent_evaluates_hipaa_breach() -> None:
    """Test policy_agent matches HIPAA regulations when triaging a PHI leak."""
    triage = TriageResult(
        severity=SeverityLevel.CRITICAL,
        category=FailureCategory.PHI_LEAK,
        summary="Unencrypted SSN and patient diagnoses logged in plaintext to debug log",
        confidence=0.92,
        requires_human_review=False,
        parsed_details=ParsedLogDetails(
            error_message="Data leak in logger",
            failing_component="logger.py",
            detected_keywords=["phi", "ssn", "patient", "plaintext"]
        )
    )
    assessment = run_policy_agent(triage)
    assert len(assessment.matched_policies) >= 1
    assert assessment.risk_level == SeverityLevel.CRITICAL
    assert assessment.requires_human_review is True  # Critical triggers review
    assert any("HIPAA" in flag for flag in assessment.compliance_flags)


def test_end_to_end_agent_pipeline() -> None:
    """Test full multi-agent pipeline from raw failure to final executive QAReport."""
    input_data = TestFailureInput(
        raw_log="[EHR-Core] SSN 000-12-3456 revealed in plaintext HTTP response headers",
        test_suite="ehr-security",
        test_case_id="TC-SEC-99"
    )
    # Agent 1
    triage_result = run_triage_agent(input_data)
    assert triage_result.category == FailureCategory.PHI_LEAK

    # Agent 2
    policy_assessment = run_policy_agent(triage_result)
    assert policy_assessment.risk_level in [SeverityLevel.CRITICAL, SeverityLevel.HIGH]

    # Agent 3
    final_report = run_report_agent(triage_result, policy_assessment)
    assert final_report.report_id.startswith("QA-REP-")
    assert final_report.human_review_required is True
    assert len(final_report.recommendations) >= 2
    assert len(final_report.audit_trail) == 3
