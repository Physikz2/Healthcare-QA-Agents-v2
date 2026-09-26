# Healthcare QA Agents - Report Agent
# Purpose: Synthesizes triage and policy findings into a structured, executive QA report.

import os
from typing import List, Optional
from dotenv import load_dotenv

from models.schemas import PolicyAssessment, QAReport, TriageResult
from tools.report_formatter import format_qa_report

load_dotenv()
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def call_gemini_report_enhancement(
    triage: TriageResult,
    policy: PolicyAssessment,
    base_recs: List[str]
) -> Optional[List[str]]:
    """Invoke Gemini model to refine executive remediation recommendations.

    Args:
        triage: TriageResult data.
        policy: PolicyAssessment data.
        base_recs: Initial recommendations list.

    Returns:
        List of refined recommendations, or None if API call fails.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        return None

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        prompt = (
            f"You are a Healthcare QA Executive Lead. Synthesize 2-3 concise, "
            f"actionable engineering and compliance remediation steps for this issue:\n"
            f"Failure: {triage.summary}\n"
            f"Severity: {triage.severity.value}\n"
            f"Compliance Risk: {policy.risk_level.value}\n"
            f"Flags: {'; '.join(policy.compliance_flags)}\n"
            f"Return exactly 2 or 3 bullet points separated by newlines."
        )
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        if response and response.text:
            lines = [line.strip().lstrip("-*123456789. ") for line in response.text.splitlines() if line.strip()]
            if lines:
                return lines[:3]
    except Exception:
        return None
    return None


def run_report_agent(
    triage_result: TriageResult,
    policy_assessment: PolicyAssessment
) -> QAReport:
    """Execute the Report Agent workflow to build a validated QAReport.

    Args:
        triage_result: Validated TriageResult output from Triage Agent.
        policy_assessment: Validated PolicyAssessment output from Policy Agent.

    Returns:
        Validated QAReport model.
    """
    # Tool 4: Report Formatter
    report: QAReport = format_qa_report(
        triage=triage_result,
        policy=policy_assessment
    )

    # Optional Gemini enhancement of recommendations
    enhanced_recs = call_gemini_report_enhancement(
        triage=triage_result,
        policy=policy_assessment,
        base_recs=report.recommendations
    )
    if enhanced_recs:
        combined = list(dict.fromkeys(enhanced_recs + report.recommendations))
        report.recommendations = combined[:5]

    return report
