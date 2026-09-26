# Healthcare QA Agents - Triage Agent
# Purpose: Triages raw test failure logs, classifies severity, and reasons over failure causes.

import os
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

from models.schemas import (
    FailureCategory,
    ParsedLogDetails,
    SeverityLevel,
    TestFailureInput,
    TriageResult,
)
from tools.log_parser import parse_test_failure
from tools.severity_classifier import classify_severity_and_category

load_dotenv()
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.75"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def call_gemini_reasoning(parsed: ParsedLogDetails, initial_summary: str) -> Optional[str]:
    """Invoke Google Gemini model to reason over the root cause of the failure.

    Args:
        parsed: Parsed log details.
        initial_summary: Baseline summary.

    Returns:
        Enhanced reasoning summary string, or None if API is unavailable.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        return None

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        prompt = (
            f"You are a Healthcare QA Triage Agent. Analyze this failure:\n"
            f"Component: {parsed.failing_component}\n"
            f"Error: {parsed.error_message}\n"
            f"Keywords: {', '.join(parsed.detected_keywords)}\n"
            f"Stack: {parsed.stack_trace_snippet}\n"
            f"Provide a concise, 2-sentence clinical QA diagnostic summary."
        )
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        if response and response.text:
            return response.text.strip().replace("\n", " ")
    except Exception:
        # Fall back cleanly if network or quota issue occurs
        return None
    return None


def run_triage_agent(failure_input: TestFailureInput) -> TriageResult:
    """Execute the Triage Agent workflow on a test failure event.

    Args:
        failure_input: Validated TestFailureInput containing raw logs or structured dict.

    Returns:
        Validated TriageResult model.

    Raises:
        ValueError: If input is invalid or missing required data.
    """
    if not failure_input.raw_log and not failure_input.structured_data:
        raise ValueError("Triage input must contain either raw_log or structured_data.")

    # Tool 1: Log Parser
    parsed: ParsedLogDetails = parse_test_failure(
        raw_log=failure_input.raw_log,
        structured_data=failure_input.structured_data
    )

    # Tool 2: Severity Classifier
    severity, category, baseline_confidence = classify_severity_and_category(parsed)

    # Agent Reasoning: Gemini LLM enrichment
    base_summary = (
        f"Failure detected in {parsed.failing_component}: {parsed.error_message}. "
        f"Identified category {category.value} with severity {severity.value}."
    )
    llm_summary = call_gemini_reasoning(parsed, base_summary)
    final_summary = llm_summary if llm_summary else base_summary

    # Confidence calculation and Guardrail routing
    confidence = round(baseline_confidence if not llm_summary else min(baseline_confidence + 0.05, 0.99), 2)
    requires_human = confidence < CONFIDENCE_THRESHOLD

    # Guardrail: Construct and validate Pydantic output
    result = TriageResult(
        severity=severity,
        category=category,
        summary=final_summary,
        confidence=confidence,
        requires_human_review=requires_human,
        parsed_details=parsed,
        agent_timestamp=datetime.utcnow()
    )
    return result
