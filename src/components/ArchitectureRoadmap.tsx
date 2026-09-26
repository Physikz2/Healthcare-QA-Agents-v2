import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Server,
  Cloud,
  Lock,
  GitBranch,
  Terminal,
  Database,
  LineChart,
  Boxes,
  Shield,
  FileCheck
} from 'lucide-react';

export const ArchitectureRoadmap: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(1);

  const stages = [
    {
      stage: 1,
      name: 'Stage 1: Production Core (Current)',
      badge: 'SHIPPED & VERIFIED',
      description: 'Working prototype with 3 agents, 4 tools, FastAPI REST backend, JWT authentication, Pytest suite, Dockerfile, and GitHub Actions CI.',
      highlights: [
        '3 Google ADK Orchestrated Agents (Triage, Policy, Report)',
        '4 Core Tools (log_parser, severity_classifier, rag_policy_lookup, report_formatter)',
        'FastAPI REST endpoints with PyJWT Bearer Auth',
        'Pydantic v2 input and output schema enforcement',
        'Confidence threshold guardrail (routing score < 0.75 to human QA)',
        'Pytest unit, agent, and API test suites with Docker containerization'
      ]
    },
    {
      stage: 2,
      name: 'Stage 2: Specialized Agent Swarms',
      badge: 'NEXT PHASE',
      description: 'Domain-specific agent expansion, parallel DAG execution, memory persistence, and sub-agent hierarchies.',
      highlights: [
        'Dedicated Data Privacy Agent with automated PII regex tokenization',
        'PHI De-Identification Agent checking Safe Harbor & Expert Determination',
        'Consent Verification Agent evaluating FHIR Consent resources in real-time',
        'Parallel agent execution over asynchronous worker pools',
        'Agent Memory across historical test runs to identify regression patterns',
        'Loop Agents with automated retry heuristics on ambiguous log inputs'
      ]
    },
    {
      stage: 3,
      name: 'Stage 3: Enterprise Healthtech Integrations',
      badge: 'ECOSYSTEM',
      description: 'Bidirectional sync with hospital EHR systems, issue trackers, CI/CD runners, and enterprise identity.',
      highlights: [
        'Automated Jira and Linear defect creation with pre-populated regulatory tags',
        'GitHub Actions and GitLab CI automated quarantine gates for breaking tests',
        'Slack and PagerDuty incident alerts on critical HIPAA/FDA compliance breaches',
        'Native HL7 v2 and FHIR R4 clinical data validator pipelines',
        'Snowflake and AWS S3 data warehouse telemetry streaming',
        'Enterprise Single Sign-On (Okta, Azure AD, OAuth 2.0 PKCE)'
      ]
    },
    {
      stage: 4,
      name: 'Stage 4: AI Governance, Safety & Audit',
      badge: 'GOVERNANCE',
      description: 'Full regulatory compliance mapping, automated red-teaming, prompt versioning, and drift detection.',
      highlights: [
        'Automated PII/PHI redaction proxy prior to LLM context ingestion',
        'Cryptographically immutable audit trails with HMAC-SHA256 signatures',
        'Model and prompt versioning with rollback capabilities',
        'Real-time semantic drift detection and reasoning consistency monitoring',
        'Formal regulatory mapping to HIPAA, HITECH, FDA 21 CFR Part 11, and HITRUST',
        'Human-in-the-loop approval workflows with digital signature sign-offs'
      ]
    },
    {
      stage: 5,
      name: 'Stage 5: Multi-Tenant Enterprise Platform',
      badge: 'SCALE',
      description: 'Global multi-region deployment, granular RBAC, data residency isolation, and carrier-grade SLAs.',
      highlights: [
        'Multi-tenant tenant isolation with tenant-specific regulatory corpora',
        'Role-Based Access Control (RBAC) with granular clinical QA scopes',
        'Regional data residency controls (US HIPAA, EU GDPR, UK NHS compliance)',
        'Automated load testing and high-availability disaster recovery failover',
        'Cost governance and token quota management per clinical application team',
        'Continuous automated regression suite running 24/7 over synthetic test datasets'
      ]
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white border border-slate-300 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-900 text-white">
                SYSTEM ARCHITECTURE
              </span>
              <span className="font-mono text-xs text-slate-500">
                BLUEPRINT: MULTI-AGENT CLINICAL COMPLIANCE
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1 uppercase tracking-tight">
              Enterprise Healthcare QA System Topology & Five-Stage Roadmap
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Rigid architectural design connecting API Gateway security, Google ADK orchestration, specialized clinical reasoning, regulatory RAG retrieval, and audit guardrails.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 bg-teal-50 border border-teal-700 text-teal-900 font-bold">
              STAGE 1 ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Structured Topology Diagram */}
      <div className="bg-white border border-slate-300 p-5 overflow-x-auto">
        <div className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200 flex items-center justify-between">
          <span>Master System Architecture Diagram</span>
          <span className="text-slate-500 font-normal">DATAFLOW DIRECTION: TOP-DOWN PIPELINE</span>
        </div>

        <div className="min-w-[700px] flex flex-col items-center gap-3 font-mono text-xs">
          {/* Level 1: API Gateway */}
          <div className="w-96 bg-slate-100 border-2 border-slate-900 p-2.5 text-center">
            <div className="font-bold text-slate-950 uppercase">1. API Gateway & Security Filter</div>
            <div className="text-[11px] text-slate-600 mt-0.5">FastAPI · PyJWT Bearer Auth · Rate Limiting · CORS</div>
          </div>

          <div className="h-3 w-0.5 bg-slate-900" />

          {/* Level 2: Orchestrator */}
          <div className="w-[450px] bg-slate-900 text-white border-2 border-slate-950 p-3 text-center">
            <div className="font-bold uppercase tracking-wider text-teal-300 flex items-center justify-center gap-2">
              <Cpu className="w-4 h-4" />
              2. Google ADK Master Orchestrator Agent
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              Task Decomposition · State Routing · Confidence Guardrails · LLM Context
            </div>
          </div>

          <div className="h-3 w-0.5 bg-slate-900" />

          {/* Level 3: Three Specialized Agents */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-3xl">
            {/* Triage */}
            <div className="bg-slate-50 border-2 border-slate-300 p-3 text-center">
              <div className="font-bold text-slate-900 uppercase text-xs">3A. Triage Agent</div>
              <div className="text-[10px] text-slate-600 font-bold mt-1">log_parser + severity_classifier</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Gemini Diagnostic Reasoning</div>
            </div>

            {/* Policy */}
            <div className="bg-slate-50 border-2 border-slate-300 p-3 text-center">
              <div className="font-bold text-slate-900 uppercase text-xs">3B. Policy Agent</div>
              <div className="text-[10px] text-slate-600 font-bold mt-1">rag_policy_lookup</div>
              <div className="text-[10px] text-slate-500 mt-0.5">HIPAA / FDA CFR / FHIR RAG</div>
            </div>

            {/* Report */}
            <div className="bg-slate-50 border-2 border-slate-300 p-3 text-center">
              <div className="font-bold text-slate-900 uppercase text-xs">3C. Report Agent</div>
              <div className="text-[10px] text-slate-600 font-bold mt-1">report_formatter</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Synthesis, CAPA & Audit Trail</div>
            </div>
          </div>

          <div className="h-3 w-0.5 bg-slate-900" />

          {/* Level 4: Guardrail Layer */}
          <div className="w-[520px] bg-amber-50 border-2 border-amber-600 p-2.5 text-center">
            <div className="font-bold text-amber-950 uppercase flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              4. Guardrails & Output Validation Layer
            </div>
            <div className="text-[10px] text-amber-900 mt-0.5">
              Pydantic v2 Contracts · Confidence Threshold &lt; 0.75 Routing · Human Signoff Mandate
            </div>
          </div>

          <div className="h-3 w-0.5 bg-slate-900" />

          {/* Level 5: Data & Vector Storage */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
            <div className="bg-slate-100 border border-slate-300 p-2 text-center">
              <div className="font-bold text-slate-900 text-xs">Data & Vector Layer</div>
              <div className="text-[10px] text-slate-600 mt-0.5">policies.json · Embeddings · S3</div>
            </div>
            <div className="bg-slate-100 border border-slate-300 p-2 text-center">
              <div className="font-bold text-slate-900 text-xs">Observability & Audit</div>
              <div className="text-[10px] text-slate-600 mt-0.5">Immutable Audit Trail · Datadog · SIEM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Five-Stage Roadmap Segmented Display */}
      <div className="bg-white border border-slate-300 p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <span className="font-mono text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-700" />
            Five-Stage System Evolution Roadmap
          </span>
          <span className="font-mono text-[10px] text-slate-500">SCALE SPECIFICATION</span>
        </div>

        {/* Stage Selector Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 font-mono text-xs">
          {stages.map((s) => (
            <button
              key={s.stage}
              onClick={() => setActiveStage(s.stage)}
              className={`p-2 border text-center transition-all cursor-pointer font-bold ${
                activeStage === s.stage
                  ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-[10px] opacity-75">STAGE 0{s.stage}</div>
              <div className="truncate text-xs">{s.badge}</div>
            </button>
          ))}
        </div>

        {/* Stage Detail Card */}
        {(() => {
          const cur = stages.find((s) => s.stage === activeStage)!;
          return (
            <div className="bg-slate-50 border border-slate-300 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-950 font-mono text-sm uppercase">{cur.name}</h4>
                  <p className="text-xs text-slate-600 mt-0.5 font-sans">{cur.description}</p>
                </div>
                <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-900 text-white font-bold shrink-0">
                  {cur.badge}
                </span>
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold text-slate-600 uppercase block mb-2">
                  Key Capabilities Delivered:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans">
                  {cur.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 bg-white p-2 border border-slate-200 text-slate-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Cloud Run & Vertex AI Enterprise Path */}
      <div className="bg-white border border-slate-300 p-4 space-y-2">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-900 uppercase pb-1.5 border-b border-slate-200">
          <Cloud className="w-4 h-4 text-slate-700" />
          Google Cloud Run & Vertex AI Production Migration Path
        </div>

        <p className="text-xs text-slate-600">
          The system codebase uses Google ADK orchestration and Google Gen AI SDK patterns. Switching from the free AI Studio tier to Google Cloud Vertex AI is a configuration change with zero agent code changes required.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
          <div className="p-3 bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900 text-xs mb-1 uppercase">1. Cloud Run Deployment</div>
            <div className="text-[11px] text-slate-600 leading-relaxed">
              gcloud builds submit --tag gcr.io/$PROJECT/healthcare-qa-agents<br />
              gcloud run deploy --image gcr.io/$PROJECT/healthcare-qa-agents
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900 text-xs mb-1 uppercase">2. Vertex AI Credentials</div>
            <div className="text-[11px] text-slate-600 leading-relaxed">
              USE_VERTEX_AI=true<br />
              GOOGLE_CLOUD_PROJECT=your-project-id<br />
              GOOGLE_CLOUD_LOCATION=us-central1
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
