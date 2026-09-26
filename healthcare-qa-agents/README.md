<!-- Healthcare QA Agents - System Documentation -->
<!-- Purpose: Architecture guide, setup, running instructions, testing, and Vertex AI migration path. -->

# Healthcare QA Agents

Healthcare QA Agents is an autonomous multi-agent QA system designed for healthtech software platforms. It triages automated test failures, evaluates potential breaches against healthcare regulatory standards (HIPAA, FDA 21 CFR Part 11, HL7 FHIR), and compiles structured, audit-ready QA reports using Google ADK and Google Gemini.

## Three-Agent Architecture

1. **Triage Agent**: Ingests raw stack traces and JSON logs. Uses `log_parser` and `severity_classifier` tools with Gemini reasoning to categorize issues and assign severity.
2. **Policy Agent**: Receives triage results and queries an embedded regulatory corpus using the `rag_policy_lookup` tool. Evaluates compliance breaches and maps risk.
3. **Report Agent**: Synthesizes triage and policy assessments via `report_formatter` to build an executive `QAReport` with prioritized remediation recommendations and audit trails.

## Guardrails & Confidence Routing

- **Pydantic v2 Validation**: Every agent input and output is strictly validated against schemas.
- **Fail-Safe Confidence Threshold**: If confidence falls below 0.75 or critical risk is flagged, the output is routed to mandatory human QA review (`requires_human_review = True`).
- **Timestamped Audit Trail**: Every agent logs execution timestamps and decision rationale.

## Quickstart

### 1. Installation
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### 2. Configure Free Gemini API
Set your Google AI Studio free tier key in `.env`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run FastAPI Service
```bash
uvicorn api.main:app --reload --port 8000
```
Interactive Swagger docs: `http://localhost:8000/docs`

### 4. Run Pytest Suite
```bash
pytest -v
```

### 5. Run with Docker
```bash
docker build -t healthcare-qa-agents .
docker run -p 8000:8000 --env-file .env healthcare-qa-agents
```

## API Authentication

All agent endpoints require a JWT Bearer token. Generate a demo token:
```bash
curl -X POST http://localhost:8000/token \
  -H "Content-Type: application/json" \
  -d '{"username": "qa-lead", "role": "compliance_lead"}'
```

Use the returned `access_token` in headers:
```bash
Authorization: Bearer <access_token>
```

For production, replace demo token generation with OAuth 2.0 / OIDC provider (Okta, Keycloak, or Google Identity) and validate standard RSA256 JWKS tokens.

## Cloud Run Deployment

Deploy containerized agents directly to Google Cloud Run:
```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/healthcare-qa-agents
gcloud run deploy healthcare-qa-agents \
  --image gcr.io/$PROJECT_ID/healthcare-qa-agents \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY
```

## Vertex AI Migration Path

To migrate from the free Google AI Studio Gemini API tier to Google Cloud Vertex AI:

1. Enable the Vertex AI API in Google Cloud:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```
2. Create a Google Cloud Service Account with `roles/aiplatform.user` permissions.
3. Configure environment variables in `.env`:
   ```bash
   USE_VERTEX_AI=true
   GOOGLE_CLOUD_PROJECT=your-gcp-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json
   ```
4. The Google Gen AI SDK seamlessly switches to Vertex AI backend authentication when Vertex credentials and project are present.

## Scaling Roadmap

- **Stage 1 (Current)**: 3-agent orchestration, tools, FastAPI, JWT auth, pytest, Docker, CI.
- **Stage 2**: Specialized agents (Data Privacy, PHI Detection, Consent Verification), agent memory.
- **Stage 3**: Enterprise integrations with Jira, GitHub Actions, Slack, Snowflake, and Datadog.
- **Stage 4**: Safety governance with automated PII redaction and drift detection.
- **Stage 5**: Multi-tenant platform with RBAC and healthcare data residency controls.
