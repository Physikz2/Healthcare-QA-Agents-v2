# Healthcare QA Agents - Log Parser Tool
# Purpose: Parse raw test failure logs or structured error payloads into structured details.

import json
import re
from typing import Any, Dict, List, Optional
from models.schemas import ParsedLogDetails


def extract_keywords(text: str) -> List[str]:
    """Extract healthcare and security related keywords from log text.

    Args:
        text: The raw log or stack trace string.

    Returns:
        List of unique lower-cased matched keywords.
    """
    targets = [
        "phi", "ssn", "mrn", "patient", "encryption", "tls", "ssl",
        "plaintext", "audit", "fhir", "hl7", "consent", "unauthorized",
        "forbidden", "breach", "token", "signature", "ephi", "nullpointer"
    ]
    lowered = text.lower()
    return [kw for kw in targets if re.search(r"\b" + re.escape(kw) + r"\b", lowered)]


def detect_failing_component(text: str, structured_data: Optional[Dict[str, Any]] = None) -> str:
    """Identify the software component, route, or service where the test failure occurred.

    Args:
        text: Raw log text.
        structured_data: Optional structured JSON metadata.

    Returns:
        String identifier of the failing component.
    """
    if structured_data and "component" in structured_data:
        return str(structured_data["component"])

    endpoint_match = re.search(r"(?:GET|POST|PUT|DELETE|PATCH)\s+([/\w\-\.]+)", text)
    if endpoint_match:
        return endpoint_match.group(1)

    module_match = re.search(r"File \"([^\"]+)\", line \d+, in (\w+)", text)
    if module_match:
        return f"{module_match.group(1)}:{module_match.group(2)}"

    service_match = re.search(r"\[(service-[a-zA-Z0-9\-]+|ehr-[a-zA-Z0-9\-]+|fhir-[a-zA-Z0-9\-]+)\]", text)
    if service_match:
        return service_match.group(1)

    return "core.healthcare.service"


def parse_test_failure(
    raw_log: Optional[str] = None,
    structured_data: Optional[Dict[str, Any]] = None
) -> ParsedLogDetails:
    """Parse raw log text or structured data into a validated ParsedLogDetails instance.

    Args:
        raw_log: Raw textual log, stack trace, or test output.
        structured_data: Optional pre-parsed dictionary.

    Returns:
        ParsedLogDetails object with extracted message, snippet, component, and keywords.
    """
    combined_text = ""
    if raw_log:
        combined_text += raw_log.strip()
    if structured_data:
        try:
            combined_text += "\n" + json.dumps(structured_data, indent=2)
        except Exception:
            combined_text += "\n" + str(structured_data)

    if not combined_text.strip():
        combined_text = "Unknown error: Empty log and structured data provided"

    error_lines = [line.strip() for line in combined_text.splitlines() if line.strip()]
    primary_error = "Unknown healthcare system test failure"

    for line in error_lines:
        if any(token in line for token in ["Error", "Exception", "FAIL", "assert", "Violation", "Denied"]):
            primary_error = line
            break
    if primary_error == "Unknown healthcare system test failure" and error_lines:
        primary_error = error_lines[0][:150]

    lines = combined_text.splitlines()
    snippet_lines = lines[:15] if len(lines) > 15 else lines
    snippet = "\n".join(snippet_lines)

    component = detect_failing_component(combined_text, structured_data)
    keywords = extract_keywords(combined_text)

    return ParsedLogDetails(
        error_message=primary_error[:250],
        stack_trace_snippet=snippet[:1000],
        failing_component=component,
        detected_keywords=keywords
    )
