# Healthcare QA Agents - FastAPI Application
# Purpose: Expose authenticated REST endpoints for multi-agent triage, assessment, and reporting.

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from typing import Any, Dict
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from agents.policy_agent import run_policy_agent
from agents.report_agent import run_report_agent
from agents.triage_agent import run_triage_agent
from api.auth import create_access_token, get_current_user
from models.schemas import (
    HealthResponse,
    PolicyAssessment,
    QAReport,
    ReportRequest,
    TestFailureInput,
    TokenRequest,
    TokenResponse,
    TriageResult,
)

app = FastAPI(
    title="Healthcare QA Agents API",
    description="Multi-agent QA system for healthcare software triage, policy check, and reporting.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check() -> HealthResponse:
    """Check system status and active agent configuration.

    Returns:
        HealthResponse object indicating status and agent readiness.
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        active_agents=["TriageAgent", "PolicyAgent", "ReportAgent"],
        version="1.0.0"
    )


@app.post("/token", response_model=TokenResponse, tags=["Authentication"])
def generate_demo_token(request: TokenRequest) -> TokenResponse:
    """Generate a JWT bearer token for demo testing and API invocation.

    Args:
        request: TokenRequest with username and role.

    Returns:
        TokenResponse with signed access_token.
    """
    claims = {"sub": request.username, "role": request.role}
    token = create_access_token(claims)
    return TokenResponse(access_token=token, token_type="bearer", expires_in_minutes=60)


@app.post("/triage", response_model=TriageResult, tags=["Agents"])
def triage_failure(
    payload: TestFailureInput,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> TriageResult:
    """Triage a raw test failure and return structured classification and severity.

    Args:
        payload: Test failure containing raw logs or structured error data.
        current_user: Authenticated user claims from JWT.

    Returns:
        Structured TriageResult validated by Pydantic.
    """
    try:
        return run_triage_agent(payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Triage agent encountered an unexpected error: {str(e)}"
        )


@app.post("/assess", response_model=PolicyAssessment, tags=["Agents"])
def assess_policy_compliance(
    triage_result: TriageResult,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> PolicyAssessment:
    """Evaluate a triage result against healthcare regulatory policies via RAG.

    Args:
        triage_result: TriageResult output from Triage Agent.
        current_user: Authenticated user claims from JWT.

    Returns:
        Structured PolicyAssessment validated by Pydantic.
    """
    try:
        return run_policy_agent(triage_result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Policy agent encountered an unexpected error: {str(e)}"
        )


@app.post("/report", response_model=QAReport, tags=["Agents"])
def generate_qa_report(
    payload: ReportRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> QAReport:
    """Synthesize triage and policy results into an executive QA report.

    Args:
        payload: Combined TriageResult and PolicyAssessment.
        current_user: Authenticated user claims from JWT.

    Returns:
        Structured QAReport validated by Pydantic.
    """
    try:
        return run_report_agent(payload.triage_result, payload.policy_assessment)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report agent encountered an unexpected error: {str(e)}"
        )
