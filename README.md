<!-- Healthcare QA Agents - System Documentation -->
<!-- Purpose: Architecture guide, tech stack, local setup, testing, containerization, and roadmap. -->

# Healthcare QA Agents

Healthcare QA Agents is an autonomous multi-agent QA platform engineered for healthtech software delivery pipelines. The system ingests test failure traces, interrogates findings against statutory healthcare regulations, and produces structured, audit-ready compliance reports using Google ADK and Google Gemini.

## 1. Project Overview & Architecture

The platform coordinates three specialized agents via Google ADK orchestration, enforcing strict Pydantic v2 schema contracts, confidence thresholds, and timestamped audit logs:

- **Triage Agent** (`agents/triage_agent.py`): Ingests raw stack traces, pytest logs, or JSON errors. Employs `log_parser` and `severity_classifier` tools alongside Gemini reasoning to isolate the failing component, extract clinical entities, and assign technical severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Policy Agent** (`agents/policy_agent.py`): Accepts triage output and executes semantic vector retrieval (`rag_policy_lookup`) against an embedded regulatory corpus (`data/policies.json`). Evaluates non-compliance risks and flags active statutory violations.
- **Report Agent** (`agents/report_agent.py`): Synthesizes technical diagnostics and regulatory findings via `report_formatter`. Generates an executive `QAReport` containing prioritized Corrective and Preventive Actions (CAPA), calculates combined risk, and routes issues with confidence below 0.75 or critical severity to mandatory human QA review.

### Regulatory Compliance Standards Enforced

- **HIPAA Security Rule (45 CFR § 164.312)**: Technical safeguards covering transmission security, end-to-end TLS 1.3 encryption, and access controls.
- **HIPAA Privacy Rule (45 CFR § 164.502 / § 164.514)**: Minimum necessary disclosure standards, de-identification mandates, and protection against plaintext ePHI exposure in log streams.
- **FDA 21 CFR Part 11 (21 CFR § 11.10)**: Audit trail integrity, operator identification, and immutable chronological recording of medical record state modifications.
- **HL7 FHIR & SMART on FHIR**: Enforcement of patient-directed consent scopes, OAuth 2.0 access controls, and resource-level authorization.

## 2. Tech Stack

- **Runtime & Language**: Python 3.11+
- **Agent Orchestration**: Google ADK (`google-adk`)
- **LLM Engine**: Google Gemini via free-tier Google AI Studio (`gemini-2.5-flash` / `gemini-3.8-flash`) with documented Vertex AI migration
- **API Framework**: FastAPI with Starlette and Uvicorn
- **Data Validation & Guardrails**: Pydantic v2 (`BaseModel`, field validators, strict enums)
- **Authentication**: PyJWT (HMAC-SHA256 Bearer tokens)
- **Automated Testing**: pytest and pytest-asyncio
- **Containerization**: Docker (multi-stage non-root container) and Docker Compose
- **Continuous Integration**: GitHub Actions

## 3. Setup & Environment Configuration

Clone the repository and copy the environment configuration template:

```bash
git clone https://github.com/your-org/healthcare-qa-agents.git
cd healthcare-qa-agents
cp .env.example .env
```

Configure your environment variables in `.env`:

```ini
# Google AI Studio Free-Tier API Key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# JWT Security Settings
JWT_SECRET_KEY=change-this-to-a-secure-random-secret-key-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60

# Guardrail & Safety Thresholds
CONFIDENCE_THRESHOLD=0.75
ENVIRONMENT=development
LOG_LEVEL=INFO
```

## 4. Local Installation & Execution

### Step 1: Create Virtual Environment and Install Dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 2: Start the FastAPI Service

```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

- **Interactive Swagger Documentation**: `http://localhost:8000/docs`
- **OpenAPI Schema Specification**: `http://localhost:8000/openapi.json`
- **System Health Check**: `http://localhost:8000/health`

### Step 3: Authenticate and Execute Endpoints

Acquire a demo Bearer JWT token:

```bash
curl -X POST http://localhost:8000/token \
  -H "Content-Type: application/json" \
  -d '{"username": "qa-lead", "role": "compliance_auditor"}'
```

Dispatch a test failure for autonomous triage:

```bash
curl -X POST http://localhost:8000/triage \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "raw_log": "PatientDataLeakException: Plaintext SSN leaked in debug trace: ssn=***-**-1234 on /api/v1/patients",
    "test_suite": "ehr-compliance-suite",
    "test_case_id": "TC-HIPAA-01"
  }'
```

## 5. Testing

The test suite covers individual tool functions, agent orchestration pipelines, guardrail validation, and authenticated FastAPI routes. Run tests via pytest:

```bash
# Execute full test suite with verbose output
pytest -v

# Run targeted test suites
pytest tests/test_tools.py -v
pytest tests/test_agents.py -v
pytest tests/test_api.py -v
```

All agent tests include mock fallbacks to enable deterministic offline runs without requiring live API keys.

## 6. Containerized Deployment

### Standalone Docker Image

Build and execute the hardened, non-root Docker container:

```bash
docker build -t healthcare-qa-agents:latest .
docker run -d --name healthcare-qa -p 8000:8000 --env-file .env healthcare-qa-agents:latest
```

Verify service availability:

```bash
curl http://localhost:8000/health
```

### Multi-Service Docker Compose

Launch the containerized environment using Docker Compose:

```bash
docker-compose up --build -d
```

To monitor container output or tear down:

```bash
docker-compose logs -f
docker-compose down
```

## 7. CI/CD & Scaling Roadmap

### GitHub Actions CI Workflow

The automated CI pipeline (`.github/workflows/ci.yml`) executes on every push and pull request across `main` and `develop` branches:

- Matrix testing on Python 3.11 and 3.12
- Dependency resolution and environment verification
- Automated pytest execution covering unit, agent, and API tests
- Multi-platform Docker container build verification

### Enterprise Scaling Roadmap

- **Stage 1 (Current)**: 3-agent orchestration, core tools, FastAPI with JWT auth, Pydantic v2 guardrails, pytest suite, Docker, and GitHub Actions CI.
- **Stage 2: Specialized Swarms**: Dedicated Data Privacy, PHI De-Identification, and Consent Verification agents with parallel DAG execution and memory.
- **Stage 3: Healthtech Integrations**: Bidirectional connectors for Jira defect creation, GitHub Actions gates, Slack alerts, and FHIR R4 validators.
- **Stage 4: AI Governance & Safety**: Automated pre-ingestion PII redaction, cryptographic audit trails, prompt versioning, and semantic drift detection.
- **Stage 5: Enterprise Multi-Tenant Platform**: Tenant isolation, fine-grained RBAC, regional data residency controls (US HIPAA, EU GDPR), and automated regression testing.
