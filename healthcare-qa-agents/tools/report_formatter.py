# Healthcare QA Agents - Report Formatter Tool
# Purpose: Build structured, publication-ready QA reports from triage and policy results.

import uuid
from datetime import datetime
from typing import List
from models.schemas import PolicyAssessment, QAReport, SeverityLevel, TriageResult


def determine_overall_risk(
    triage_sev: SeverityLevel,
    policy_risk: SeverityLevel
) -> SeverityLevel:
    """Compute the combined overall risk rating based on triage and regulatory impact.

    Args:
        triage_sev: Severity rating from initial triage.
        policy_risk: Risk rating from regulatory policy evaluation.

    Returns:
        The highest risk level between technical severity and policy risk.
    """
    hierarchy = {
        SeverityLevel.LOW: 1,
        SeverityLevel.MEDIUM: 2,
        SeverityLevel.HIGH: 3,
        SeverityLevel.CRITICAL: 4,
    }
    score = max(hierarchy.get(triage_sev, 1), hierarchy.get(policy_risk, 1))
    for level, val in hierarchy.items():
        if val == score:
            return level
    return SeverityLevel.MEDIUM


def build_recommendations(
    triage: TriageResult,
    policy: PolicyAssessment
) -> List[str]:
    """Generate prioritized actionable engineering and compliance recommendations.

    Args:
        triage: TriageResult instance.
        policy: PolicyAssessment instance.

    Returns:
        List of remediation bullet points.
    """
    recs: List[str] = []

    # Harvest remediation hints from matched policies
    for match in policy.matched_policies:
        recs.append(f"[{match.regulation} - {match.section}] {match.remediation_hint}")

    # Add technical component-level fix
    recs.append(
        f"Isolate component '{triage.parsed_details.failing_component}' "
        f"and execute regression test suite covering {triage.category.value}."
    )

    if triage.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]:
        recs.append("Trigger automated CI pipeline quarantine for breaking health checks.")

    if not recs:
        recs.append("Conduct standard code review and re-run automated test suite.")

    return recs


def format_qa_report(
    triage: TriageResult,
    policy: PolicyAssessment
) -> QAReport:
    """Format and assemble the final structured QAReport.

    Args:
        triage: Validated TriageResult from Triage Agent.
        policy: Validated PolicyAssessment from Policy Agent.

    Returns:
        Complete validated QAReport model.
    """
    report_id = f"QA-REP-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.utcnow()
    overall = determine_overall_risk(triage.severity, policy.risk_level)
    recs = build_recommendations(triage, policy)
    human_needed = triage.requires_human_review or policy.requires_human_review

    audit = [
        f"[{triage.agent_timestamp.isoformat()}Z] TRIAGE_AGENT assessed severity={triage.severity.value} "
        f"confidence={triage.confidence:.2f}",
        f"[{policy.agent_timestamp.isoformat()}Z] POLICY_AGENT matched {len(policy.matched_policies)} "
        f"policies risk={policy.risk_level.value} confidence={policy.confidence:.2f}",
        f"[{now.isoformat()}Z] REPORT_AGENT compiled report {report_id} overall_risk={overall.value} "
        f"human_review_required={human_needed}"
    ]

    return QAReport(
        report_id=report_id,
        generated_at=now,
        triage_summary=triage.summary,
        policy_summary=policy.summary,
        overall_risk=overall,
        recommendations=recs,
        human_review_required=human_needed,
        audit_trail=audit
    )
