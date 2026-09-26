# Healthcare QA Agents - Policy Agent
# Purpose: Evaluate triage findings against healthcare policies using RAG and generate compliance assessments.

import os
from datetime import datetime
from typing import List, Optional
from dotenv import load_dotenv

from models.schemas import (
    PolicyAssessment,
    PolicyMatch,
    SeverityLevel,
    TriageResult,
)
from tools.rag_policy_lookup import lookup_policies

load_dotenv()
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.75"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def call_gemini_policy_reasoning(
    triage: TriageResult,
    matches: List[PolicyMatch]
) -> Optional[str]:
    """Invoke Gemini model to synthesize compliance implications across matched policies.

    Args:
        triage: TriageResult from the triage agent.
        matches: Retrieved policy matches.

    Returns:
        Compliance rationale string, or None if API is unavailable.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        return None

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        policy_snippets = "; ".join([f"{m.policy_id} ({m.regulation} {m.section})" for m in matches])
        prompt = (
            f"You are a Healthcare Policy QA Agent. Evaluate this failure:\n"
            f"Triage Summary: {triage.summary}\n"
            f"Category: {triage.category.value}\n"
            f"Severity: {triage.severity.value}\n"
            f"Matched Regulations: {policy_snippets}\n"
            f"Explain in 2 sentences whether this violates healthcare compliance standards and why."
        )
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        if response and response.text:
            return response.text.strip().replace("\n", " ")
    except Exception:
        return None
    return None


def run_policy_agent(triage_result: TriageResult) -> PolicyAssessment:
    """Execute the Policy Agent workflow using RAG retrieval over healthcare regulations.

    Args:
        triage_result: Validated TriageResult output from Triage Agent.

    Returns:
        Validated PolicyAssessment model with matched policies and compliance flags.
    """
    # Formulate query for RAG lookup
    query_text = (
        f"{triage_result.category.value} {triage_result.summary} "
        f"{' '.join(triage_result.parsed_details.detected_keywords)} "
        f"{triage_result.parsed_details.error_message}"
    )

    # Tool 3: RAG Policy Lookup
    matches: List[PolicyMatch] = lookup_policies(query_text=query_text, top_k=3, min_score=0.10)

    compliance_flags: List[str] = []
    for match in matches:
        flag = f"{match.regulation}: {match.section} violation risk ({match.policy_id})"
        compliance_flags.append(flag)

    if not matches:
        compliance_flags.append("No direct regulatory violation identified in embedded corpus")

    # Determine risk level
    if any(m.similarity_score > 0.40 for m in matches) and triage_result.severity == SeverityLevel.CRITICAL:
        risk_level = SeverityLevel.CRITICAL
    elif matches and triage_result.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]:
        risk_level = SeverityLevel.HIGH
    elif matches:
        risk_level = SeverityLevel.MEDIUM
    else:
        risk_level = SeverityLevel.LOW

    # Agent reasoning
    base_summary = (
        f"Assessed {len(matches)} relevant healthcare compliance policies for category "
        f"{triage_result.category.value}. Primary regulatory exposure: "
        f"{matches[0].regulation if matches else 'Standard Operational Quality'}."
    )
    llm_summary = call_gemini_policy_reasoning(triage_result, matches)
    final_summary = llm_summary if llm_summary else base_summary

    confidence = round(0.88 if matches else 0.65, 2)
    requires_human = confidence < CONFIDENCE_THRESHOLD or risk_level == SeverityLevel.CRITICAL

    # Guardrail: Construct and validate Pydantic output
    return PolicyAssessment(
        matched_policies=matches,
        compliance_flags=compliance_flags,
        risk_level=risk_level,
        summary=final_summary,
        confidence=confidence,
        requires_human_review=requires_human,
        agent_timestamp=datetime.utcnow()
    )
