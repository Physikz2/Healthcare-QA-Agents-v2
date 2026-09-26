# Healthcare QA Agents - Tool Unit Tests
# Purpose: Verify log parsing, severity classification, RAG retrieval, and report formatting.

import pytest
from models.schemas import FailureCategory, ParsedLogDetails, SeverityLevel
from tools.log_parser import parse_test_failure
from tools.report_formatter import format_qa_report
from tools.rag_policy_lookup import lookup_policies
from tools.severity_classifier import classify_severity_and_category
from models.schemas import PolicyAssessment, PolicyMatch, TriageResult


def test_log_parser_extracts_phi_error() -> None:
    """Test log_parser extracts healthcare error messages and keywords correctly."""
    log_text = """
    ERROR 2026-09-25 10:14:02 [ehr-sync-service] POST /api/v1/patients/4921
    PatientDataLeakException: Unencrypted PHI detected in payload log: ssn=***-**-1234
    File "services/sync.py", line 42, in process_patient
    """
    parsed = parse_test_failure(raw_log=log_text)
    assert "PatientDataLeakException" in parsed.error_message
    assert "phi" in parsed.detected_keywords or "ssn" in parsed.detected_keywords
    assert parsed.failing_component is not None


def test_severity_classifier_maps_phi_to_critical() -> None:
    """Test severity_classifier marks unencrypted PHI as CRITICAL."""
    parsed = ParsedLogDetails(
        error_message="PatientDataLeakException: plaintext exposure of patient records",
        failing_component="/api/patients",
        detected_keywords=["phi", "patient", "plaintext", "ssn"]
    )
    sev, cat, conf = classify_severity_and_category(parsed)
    assert sev == SeverityLevel.CRITICAL
    assert cat == FailureCategory.PHI_LEAK
    assert conf >= 0.85


def test_rag_policy_lookup_returns_hipaa() -> None:
    """Test rag_policy_lookup retrieves HIPAA policies for encryption and PHI queries."""
    query = "Unencrypted PHI transmitted without TLS 1.3"
    matches = lookup_policies(query_text=query, top_k=2)
    assert len(matches) > 0
    assert any("HIPAA" in m.regulation for m in matches)
    assert matches[0].similarity_score > 0.15


def test_report_formatter_assembles_report() -> None:
    """Test report_formatter compiles valid QAReport with audit trail."""
    parsed = ParsedLogDetails(
        error_message="Audit log write failed",
        failing_component="audit_logger.py",
        detected_keywords=["audit"]
    )
    triage = TriageResult(
        severity=SeverityLevel.HIGH,
        category=FailureCategory.AUDIT_FAILURE,
        summary="Audit logging failed during prescription update",
        confidence=0.88,
        requires_human_review=False,
        parsed_details=parsed
    )
    policy = PolicyAssessment(
        matched_policies=[
            PolicyMatch(
                policy_id="FDA-PART11-003",
                title="Audit Trail Integrity",
                regulation="FDA 21 CFR Part 11",
                section="21 CFR 11.10(e)",
                similarity_score=0.85,
                remediation_hint="Ensure immutable append-only audit logging."
            )
        ],
        compliance_flags=["FDA 21 CFR Part 11: Audit trail failure"],
        risk_level=SeverityLevel.HIGH,
        summary="Audit trail failure violates FDA 21 CFR Part 11 requirements.",
        confidence=0.90,
        requires_human_review=False
    )
    report = format_qa_report(triage, policy)
    assert report.report_id.startswith("QA-REP-")
    assert report.overall_risk == SeverityLevel.HIGH
    assert len(report.recommendations) >= 1
    assert len(report.audit_trail) == 3
