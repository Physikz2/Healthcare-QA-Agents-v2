# Healthcare QA Agents - Severity Classifier Tool
# Purpose: Map failure patterns and keywords to healthcare severity levels and categories.

from typing import List, Tuple
from models.schemas import FailureCategory, ParsedLogDetails, SeverityLevel


def classify_severity_and_category(
    parsed: ParsedLogDetails
) -> Tuple[SeverityLevel, FailureCategory, float]:
    """Classify the severity level and healthcare failure category from parsed log details.

    Args:
        parsed: Parsed log details containing extracted keywords and error message.

    Returns:
        A tuple of (SeverityLevel, FailureCategory, confidence_score).
    """
    text = (parsed.error_message + " " + " ".join(parsed.detected_keywords)).lower()
    keywords: List[str] = parsed.detected_keywords

    # Critical signals: PHI exposure, plaintext SSN, active breach
    if any(k in ["phi", "ssn", "mrn", "patient", "breach"] for k in keywords):
        if any(w in text for w in ["leak", "plaintext", "unencrypted", "exposure", "dump"]):
            return SeverityLevel.CRITICAL, FailureCategory.PHI_LEAK, 0.95
        return SeverityLevel.HIGH, FailureCategory.PHI_LEAK, 0.85

    # Critical / High signals: Missing TLS or broken cipher
    if any(k in ["encryption", "tls", "ssl", "plaintext"] for k in keywords):
        if "plaintext" in text or "http:" in text or "unencrypted" in text:
            return SeverityLevel.CRITICAL, FailureCategory.ENCRYPTION_DEFECT, 0.92
        return SeverityLevel.HIGH, FailureCategory.ENCRYPTION_DEFECT, 0.88

    # Access control and consent failures
    if any(k in ["consent", "unauthorized", "forbidden"] for k in keywords) or "403" in text:
        if "fhir" in keywords or "smart" in text or "observation" in text:
            return SeverityLevel.HIGH, FailureCategory.FHIR_COMPLIANCE, 0.90
        return SeverityLevel.HIGH, FailureCategory.ACCESS_CONTROL, 0.85

    # Audit trail failures (FDA 21 CFR Part 11)
    if "audit" in keywords or "timestamp" in keywords:
        return SeverityLevel.HIGH, FailureCategory.AUDIT_FAILURE, 0.88

    # FHIR compliance issues without explicit permission bypass
    if "fhir" in keywords or "hl7" in keywords:
        return SeverityLevel.MEDIUM, FailureCategory.FHIR_COMPLIANCE, 0.80

    # Functional bugs / assertion failures
    if "assert" in text or "nullpointer" in text or "500" in text:
        return SeverityLevel.MEDIUM, FailureCategory.FUNCTIONAL_BUG, 0.75

    # Fallback to low severity with conservative confidence
    return SeverityLevel.LOW, FailureCategory.OTHER, 0.65
