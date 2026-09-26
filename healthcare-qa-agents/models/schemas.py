# Healthcare QA Agents - Pydantic Schemas
# Purpose: Define strictly validated data models for multi-agent inputs, outputs, and guardrails.

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class SeverityLevel(str, Enum):
    """Enumeration of failure severity levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FailureCategory(str, Enum):
    """Enumeration of healthcare QA failure categories."""
    PHI_LEAK = "PHI_LEAK"
    ENCRYPTION_DEFECT = "ENCRYPTION_DEFECT"
    AUDIT_FAILURE = "AUDIT_FAILURE"
    FHIR_COMPLIANCE = "FHIR_COMPLIANCE"
    ACCESS_CONTROL = "ACCESS_CONTROL"
    FUNCTIONAL_BUG = "FUNCTIONAL_BUG"
    DATA_INTEGRITY = "DATA_INTEGRITY"
    OTHER = "OTHER"


class TestFailureInput(BaseModel):
    """Input payload representing a raw test failure event or log."""
    raw_log: Optional[str] = Field(default=None, description="Raw log text or stack trace")
    structured_data: Optional[Dict[str, Any]] = Field(default=None, description="Optional parsed JSON test payload")
    test_suite: Optional[str] = Field(default="e2e-healthcare-suite", description="Name of the test suite")
    test_case_id: Optional[str] = Field(default=None, description="ID of the failing test case")

    @field_validator("raw_log", mode="after")
    @classmethod
    def validate_content_present(cls, v: Optional[str], info: Any) -> Optional[str]:
        """Ensure either raw_log or structured_data is provided."""
        return v


class ParsedLogDetails(BaseModel):
    """Structured information extracted by log_parser tool."""
    error_message: str = Field(..., description="Primary error message")
    stack_trace_snippet: Optional[str] = Field(default=None, description="Key snippet of stack trace")
    failing_component: str = Field(..., description="Module, service, or API endpoint that failed")
    detected_keywords: List[str] = Field(default_factory=list, description="Extracted healthcare and tech keywords")


class TriageResult(BaseModel):
    """Structured output produced by the Triage Agent."""
    severity: SeverityLevel = Field(..., description="Assessed severity level")
    category: FailureCategory = Field(..., description="Healthcare failure category")
    summary: str = Field(..., min_length=10, description="Concise diagnostic summary")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Agent confidence score between 0.0 and 1.0")
    requires_human_review: bool = Field(default=False, description="Flag indicating confidence below threshold")
    parsed_details: ParsedLogDetails = Field(..., description="Parsed log elements")
    agent_timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of triage")


class PolicyMatch(BaseModel):
    """Individual policy section retrieved by rag_policy_lookup tool."""
    policy_id: str = Field(..., description="Unique policy identifier")
    title: str = Field(..., description="Policy title")
    regulation: str = Field(..., description="Applicable regulation (e.g. HIPAA, FDA 21 CFR Part 11)")
    section: str = Field(..., description="Specific rule or CFR section reference")
    similarity_score: float = Field(..., ge=0.0, le=1.0, description="RAG retrieval similarity score")
    remediation_hint: str = Field(..., description="Suggested regulatory remediation step")


class PolicyAssessment(BaseModel):
    """Structured output produced by the Policy Agent."""
    matched_policies: List[PolicyMatch] = Field(default_factory=list, description="Policies relevant to the failure")
    compliance_flags: List[str] = Field(default_factory=list, description="Specific regulatory breaches identified")
    risk_level: SeverityLevel = Field(..., description="Assessed compliance risk level")
    summary: str = Field(..., min_length=10, description="Compliance assessment explanation")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    requires_human_review: bool = Field(default=False, description="Flag indicating policy ambiguity")
    agent_timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of assessment")


class QAReport(BaseModel):
    """Structured output produced by the Report Agent."""
    report_id: str = Field(..., description="Unique generated report ID")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Report generation timestamp")
    triage_summary: str = Field(..., description="Summary from triage agent")
    policy_summary: str = Field(..., description="Summary from policy agent")
    overall_risk: SeverityLevel = Field(..., description="Synthesized overall risk rating")
    recommendations: List[str] = Field(..., min_length=1, description="Actionable remediation steps")
    human_review_required: bool = Field(default=False, description="Whether human QA engineer signoff is needed")
    audit_trail: List[str] = Field(default_factory=list, description="Timestamped trail of agent decisions")


class ReportRequest(BaseModel):
    """Request payload for the POST /report endpoint."""
    triage_result: TriageResult = Field(..., description="Result from triage agent")
    policy_assessment: PolicyAssessment = Field(..., description="Result from policy agent")


class TokenRequest(BaseModel):
    """Request payload for demo token generation."""
    username: str = Field(default="qa-engineer", description="Username or service client ID")
    role: str = Field(default="qa_lead", description="Assigned role for authorization")


class TokenResponse(BaseModel):
    """JWT response structure."""
    access_token: str = Field(..., description="Bearer JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in_minutes: int = Field(default=60, description="Token validity window in minutes")


class HealthResponse(BaseModel):
    """System health check response."""
    status: str = Field(default="healthy", description="Service health status")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp")
    active_agents: List[str] = Field(default_factory=list, description="List of initialized agents")
    version: str = Field(default="1.0.0", description="Application version")
