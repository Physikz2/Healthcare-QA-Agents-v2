import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  FileText,
  UserCheck,
  Search,
  Lock,
  Clock,
  Download,
  Check,
  Sliders,
  Terminal,
  ArrowRight,
  Shield,
  FileCheck2,
  RefreshCw,
  FolderOpen,
  HelpCircle,
  Hash
} from 'lucide-react';
import { PipelineExecutionResult, SeverityLevel } from '../types';

interface Preset {
  id: string;
  incidentRef: string;
  title: string;
  categoryTag: string;
  severityDefault: SeverityLevel;
  testSuite: string;
  testCaseId: string;
  failingComponent: string;
  log: string;
}

const PRESETS: Preset[] = [
  {
    id: 'phi-leak',
    incidentRef: 'INC-HIPAA-042',
    title: 'Unencrypted ePHI Exposure in Debug Stream',
    categoryTag: 'HIPAA PRIVACY BREACH',
    severityDefault: 'CRITICAL',
    testSuite: 'ehr-audit-compliance-suite',
    testCaseId: 'TC-HIPAA-042',
    failingComponent: 'ehr.patient_exporter.service',
    log: `ERROR 2026-09-25 10:14:02.194 [ehr-sync-worker-3] POST /api/v1/patients/sync
PatientDataLeakException: Unencrypted patient record dumped into production log stream!
Details: MRN="MRN-9948210", SSN="***-**-8491", DOB="1982-04-12", Diagnosis="Type 2 Diabetes mellitus with diabetic neuropathy"
File "/app/services/patient_exporter.py", line 78, in export_patient_data
AssertionError: Expected all PHI fields to be masked with SHA-256 tokens before log ingestion.`,
  },
  {
    id: 'fhir-consent',
    incidentRef: 'INC-FHIR-819',
    title: 'HL7 FHIR Observation Scope & Consent Bypass',
    categoryTag: 'CONSENT DIRECTIVE VIOLATION',
    severityDefault: 'HIGH',
    testSuite: 'fhir-smart-oauth-suite',
    testCaseId: 'TC-FHIR-819',
    failingComponent: 'fhir.resources.observation.router',
    log: `WARN 2026-09-25 10:16:30.412 [fhir-gateway-proxy] GET /Observation?patient=Patient/10294&category=laboratory
HTTP 200 OK returned instead of HTTP 403 Forbidden!
SecurityFault: Request bearer token lacked 'patient/Observation.read' scope and patient active consent directive #8821 was expired (validity: 2026-09-01).
Component: fhir.resources.observation.router
AssertionError: Unauthorized access to clinical lab observations allowed without validated consent.`,
  },
  {
    id: 'fda-audit',
    incidentRef: 'INC-FDA-110',
    title: 'FDA 21 CFR Part 11 Audit Ledger Drop',
    categoryTag: 'AUDIT TRAIL INTEGRITY FAILURE',
    severityDefault: 'HIGH',
    testSuite: 'clinical-records-integrity',
    testCaseId: 'TC-FDA-110',
    failingComponent: 'rx.dosage.mutation.controller',
    log: `CRITICAL 2026-09-25 10:20:11.882 [audit-ledger-service] PUT /api/v1/prescriptions/RX-772910
AuditDropException: Prescription dosage mutated from 10mg to 25mg without writing immutable audit row!
Database transaction committed but AuditLog table append returned TimeoutError: connection pool exhausted.
Missing UTC timestamp, operator cryptographic signature, and previous value state.
Component: rx.dosage.mutation.controller`,
  },
  {
    id: 'tls-downgrade',
    incidentRef: 'INC-TLS-301',
    title: 'Cleartext HTTP Transport on Clinical API',
    categoryTag: 'TRANSMISSION SECURITY DEFECT',
    severityDefault: 'CRITICAL',
    testSuite: 'network-transport-security',
    testCaseId: 'TC-TLS-301',
    failingComponent: 'ingress.security.filter',
    log: `SECURITY 2026-09-25 10:22:45.002 [ingress-router]
TLSHandshakeException: Upstream client connected over cleartext HTTP port 80 requesting /api/v1/clinical/vitals
Cipher negotiation bypassed. ePHI payload transmitted without TLS 1.3 encryption.
Header 'X-Forwarded-Proto: http' detected.
Component: ingress.security.filter`,
  },
];

export const AgentConsole: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>('phi-leak');
  const [rawLog, setRawLog] = useState<string>(PRESETS[0].log);
  const [testSuite, setTestSuite] = useState<string>(PRESETS[0].testSuite);
  const [testCaseId, setTestCaseId] = useState<string>(PRESETS[0].testCaseId);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PipelineExecutionResult | null>(null);
  const [humanReviewApproved, setHumanReviewApproved] = useState<boolean>(false);
  const [qaNotes, setQaNotes] = useState<string>('');
  const [reviewOverride, setReviewOverride] = useState<SeverityLevel | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  const handleSelectPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (preset) {
      setSelectedPreset(id);
      setRawLog(preset.log);
      setTestSuite(preset.testSuite);
      setTestCaseId(preset.testCaseId);
      setResult(null);
      setHumanReviewApproved(false);
      setQaNotes('');
      setReviewOverride(null);
    }
  };

  const runPipeline = async () => {
    setLoading(true);
    setResult(null);
    setHumanReviewApproved(false);
    setReviewOverride(null);

    try {
      const response = await fetch('/api/run-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_log: rawLog,
          test_suite: testSuite,
          test_case_id: testCaseId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pipeline execution failed with status: ${response.status}`);
      }

      const data: PipelineExecutionResult = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert('Error running multi-agent pipeline. Check system console.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyle = (level: SeverityLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-800 border-red-700 font-bold';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border-amber-600 font-bold';
      case 'MEDIUM':
        return 'bg-yellow-50 text-yellow-800 border-yellow-600 font-bold';
      case 'LOW':
        return 'bg-teal-50 text-teal-800 border-teal-700 font-bold';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-400';
    }
  };

  const handleCopyReport = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.report, null, 2));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Institutional Audit System Header */}
      <div className="bg-white border border-slate-300 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-900 text-white">
                AUDIT WORKBENCH
              </span>
              <span className="font-mono text-xs text-slate-600">
                PROTOCOL: ADK MULTI-AGENT ORCHESTRATION
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1 uppercase tracking-tight">
              Clinical Test Failure Triage & Regulatory Audit Ledger
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Automated ingestion of healthcare test exceptions, regulatory cross-examination across HIPAA/FDA/FHIR corpora, and executive report certification.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={runPipeline}
              disabled={loading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold uppercase tracking-wider border border-slate-950 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                  <span>EXECUTING AGENTS...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-teal-400" />
                  <span>EXECUTE COMPLIANCE AUDIT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Clinical Sidebar vs Right Audit Log Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Intake & Failure Registry */}
        <div className="lg:col-span-4 space-y-4">
          {/* Incident Preset Registry */}
          <div className="bg-white border border-slate-300">
            <div className="bg-slate-100 border-b border-slate-300 px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-slate-700" />
                1. Clinical Incident Registry
              </span>
              <span className="font-mono text-[10px] text-slate-500">[4 SCENARIOS LOADED]</span>
            </div>

            <div className="p-2 space-y-1.5">
              {PRESETS.map((p) => {
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p.id)}
                    className={`w-full text-left p-2.5 border transition-all cursor-pointer font-sans ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className={isSelected ? 'text-teal-300 font-bold' : 'text-slate-600 font-semibold'}>
                        {p.incidentRef}
                      </span>
                      <span className={`px-1 py-0.2 border text-[9px] font-bold ${
                        isSelected ? 'border-teal-500 bg-teal-950/40 text-teal-300' : 'border-slate-300 bg-slate-100 text-slate-700'
                      }`}>
                        {p.categoryTag}
                      </span>
                    </div>
                    <div className="font-semibold text-xs truncate">
                      {p.title}
                    </div>
                    <div className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                      Target: {p.failingComponent}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Raw Log & Stack Trace Ingestion */}
          <div className="bg-white border border-slate-300">
            <div className="bg-slate-100 border-b border-slate-300 px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-700" />
                2. Test Failure Payload
              </span>
              <span className="font-mono text-[10px] text-slate-500">{rawLog.length} BYTES</span>
            </div>

            <div className="p-3 space-y-3">
              <textarea
                rows={11}
                value={rawLog}
                onChange={(e) => {
                  setRawLog(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="w-full bg-slate-950 text-teal-300 font-mono text-[11px] p-2.5 border border-slate-800 focus:outline-none focus:border-teal-600 resize-none leading-relaxed"
                placeholder="Paste raw stack trace, pytest stdout, or JSON error payload..."
              />

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Test Suite Ref
                  </label>
                  <input
                    type="text"
                    value={testSuite}
                    onChange={(e) => setTestSuite(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1 text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Case Identifier
                  </label>
                  <input
                    type="text"
                    value={testCaseId}
                    onChange={(e) => setTestCaseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1 text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Agent Orchestration Specification */}
          <div className="bg-white border border-slate-300 p-3 space-y-2 text-xs">
            <span className="font-mono text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
              ADK Agent Pipeline Topology
            </span>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="p-2 border border-slate-200 bg-slate-50 flex items-start gap-2">
                <span className="w-4 h-4 bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <div>
                  <div className="font-bold text-slate-900">TRIAGE AGENT</div>
                  <div className="text-[10px] text-slate-600">log_parser + severity_classifier</div>
                </div>
              </div>
              <div className="p-2 border border-slate-200 bg-slate-50 flex items-start gap-2">
                <span className="w-4 h-4 bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <div>
                  <div className="font-bold text-slate-900">POLICY AGENT</div>
                  <div className="text-[10px] text-slate-600">rag_policy_lookup (HIPAA/FDA/FHIR)</div>
                </div>
              </div>
              <div className="p-2 border border-slate-200 bg-slate-50 flex items-start gap-2">
                <span className="w-4 h-4 bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  3
                </span>
                <div>
                  <div className="font-bold text-slate-900">REPORT AGENT</div>
                  <div className="text-[10px] text-slate-600">report_formatter + audit_trail</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Structured Audit Log Workspace */}
        <div className="lg:col-span-8 space-y-4">
          {!result && !loading && (
            <div className="bg-white border border-slate-300 p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
              <div className="w-12 h-12 bg-slate-100 border border-slate-300 flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-slate-700" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                AUDIT SYSTEM AWAITING INTAKE DISPATCH
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-5">
                Select an incident from the registry on the left or paste a custom stack trace, then click "EXECUTE COMPLIANCE AUDIT".
              </p>
              <button
                onClick={runPipeline}
                className="px-4 py-2 bg-slate-900 text-white font-mono text-xs font-bold uppercase tracking-wider border border-slate-950 hover:bg-slate-800 cursor-pointer"
              >
                EXECUTE COMPLIANCE AUDIT NOW
              </button>
            </div>
          )}

          {loading && (
            <div className="bg-white border border-slate-300 p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
              <RefreshCw className="w-8 h-8 text-teal-700 animate-spin mb-3" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono">
                COORDINATING MULTI-AGENT AUDIT WORKFLOW
              </h3>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Parsing stack trace · Querying embedded policy corpus · Validating Pydantic schemas
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Document Master Header */}
              <div className="bg-white border-2 border-slate-900 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-300 gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                      OFFICIAL AUDIT REPORT RECORD
                    </span>
                    <h3 className="text-base font-bold text-slate-950 font-mono">
                      {result.report.report_id}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono text-xs">
                      <div className="text-[10px] text-slate-500 uppercase">OVERALL COMPLIANCE RATING</div>
                      <span className={`inline-block px-2 py-0.5 border text-xs ${getSeverityStyle(reviewOverride || result.report.overall_risk)}`}>
                        {reviewOverride || result.report.overall_risk} RISK
                      </span>
                    </div>

                    <button
                      onClick={handleCopyReport}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedReport ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <Download className="w-3.5 h-3.5" />}
                      <span>{copiedReport ? 'COPIED' : 'EXPORT JSON'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-[11px] font-mono text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">GENERATED TIMESTAMP</span>
                    <span className="text-slate-900 font-semibold">{new Date(result.report.generated_at).toISOString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">TOTAL PIPELINE LATENCY</span>
                    <span className="text-slate-900 font-semibold">{result.execution_time_ms} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">TRIAGE CONFIDENCE</span>
                    <span className="text-slate-900 font-semibold">{(result.triage.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">HUMAN REVIEW FLAG</span>
                    <span className={`font-semibold ${result.report.human_review_required ? 'text-red-700' : 'text-teal-700'}`}>
                      {result.report.human_review_required ? 'MANDATORY' : 'AUTOMATIC PASS'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Agent 1 Audit Ledger: Triage Assessment */}
              <div className="bg-white border border-slate-300">
                <div className="bg-slate-100 border-b border-slate-300 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                      AGENT 01 // DIAGNOSTIC TRIAGE ASSESSMENT
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-[10px] text-slate-500 uppercase">CATEGORY:</span>
                    <span className="px-1.5 py-0.2 bg-slate-200 border border-slate-300 text-slate-900 font-bold">
                      {result.triage.category}
                    </span>
                    <span className={`px-2 py-0.2 border ${getSeverityStyle(result.triage.severity)}`}>
                      {result.triage.severity}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="border-l-3 border-teal-700 pl-3 py-1 bg-slate-50">
                    <div className="text-[10px] font-mono uppercase font-bold text-teal-800 mb-0.5">
                      Clinical Diagnostic Rationale (Gemini LLM Reasoning):
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-sans">
                      {result.triage.summary}
                    </p>
                  </div>

                  {/* Component Breakdown Table */}
                  <div className="border border-slate-200 text-xs font-mono">
                    <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 px-3 py-1.5 uppercase">
                      <div className="col-span-4">Failing Component</div>
                      <div className="col-span-4">Detected Clinical Tokens</div>
                      <div className="col-span-4">Confidence Metric</div>
                    </div>
                    <div className="grid grid-cols-12 px-3 py-2 text-slate-800">
                      <div className="col-span-4 truncate font-semibold text-slate-900">
                        {result.triage.parsed_details.failing_component}
                      </div>
                      <div className="col-span-4 flex flex-wrap gap-1">
                        {result.triage.parsed_details.detected_keywords.map((kw, i) => (
                          <span key={i} className="px-1 py-0.2 bg-slate-100 border border-slate-300 text-[10px]">
                            {kw}
                          </span>
                        ))}
                      </div>
                      <div className="col-span-4 flex items-center gap-2">
                        <div className="w-24 bg-slate-200 h-2">
                          <div
                            className="bg-slate-900 h-2"
                            style={{ width: `${result.triage.confidence * 100}%` }}
                          />
                        </div>
                        <span className="font-bold">{(result.triage.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent 2 Audit Ledger: Regulatory Compliance Cross-Examination */}
              <div className="bg-white border border-slate-300">
                <div className="bg-slate-100 border-b border-slate-300 px-3 py-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                    AGENT 02 // REGULATORY COMPLIANCE CROSS-EXAMINATION (RAG LOOKUP)
                  </span>
                  <span className={`font-mono text-xs px-2 py-0.2 border ${getSeverityStyle(result.policy.risk_level)}`}>
                    EXPOSURE: {result.policy.risk_level}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 border border-slate-200 p-2.5">
                    {result.policy.summary}
                  </p>

                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-600 uppercase block">
                      Statutory Citations & Vector RAG Matches ({result.policy.matched_policies.length} References):
                    </span>

                    <div className="border border-slate-200 divide-y divide-slate-200">
                      {result.policy.matched_policies.map((match) => (
                        <div key={match.policy_id} className="p-3 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.2 bg-slate-900 text-white font-bold text-[10px]">
                                {match.policy_id}
                              </span>
                              <span className="font-bold text-slate-900 font-sans">{match.title}</span>
                              <span className="text-slate-500 font-mono text-[11px]">
                                [{match.regulation} - {match.section}]
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 font-sans">
                              Mandated Remediation: <span className="font-medium text-slate-900">{match.remediation_hint}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2 py-1 bg-teal-50 border border-teal-700 text-teal-900 font-bold text-[11px]">
                              {(match.similarity_score * 100).toFixed(0)}% MATCH
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent 3 Audit Ledger: CAPA Remediation & Human Signoff */}
              <div className="bg-white border border-slate-300">
                <div className="bg-slate-100 border-b border-slate-300 px-3 py-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                    AGENT 03 // CORRECTIVE ACTIONS (CAPA) & CERTIFICATION
                  </span>
                  <span className="font-mono text-[10px] text-slate-600">
                    {result.report.recommendations.length} ACTION PROTOCOLS
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Action items list */}
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] font-bold text-slate-600 uppercase block">
                      Prioritized Engineering & Regulatory Remediation Protocols:
                    </span>
                    <div className="space-y-1.5">
                      {result.report.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-2.5 border border-slate-200 bg-slate-50 text-xs text-slate-900 font-sans"
                        >
                          <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 border border-slate-300 shrink-0">
                            ACTION {idx + 1}
                          </span>
                          <span className="leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Human In The Loop Formal Sign-off Certification */}
                  <div className="border-2 border-amber-600 bg-amber-50/50 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-amber-300 gap-2">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-amber-800" />
                        <h4 className="font-mono text-xs font-bold text-amber-950 uppercase tracking-wider">
                          FORMAL CLINICAL QA AUDITOR SIGN-OFF
                        </h4>
                      </div>
                      <span className={`font-mono text-[10px] px-2 py-0.5 font-bold border ${
                        humanReviewApproved
                          ? 'bg-teal-700 text-white border-teal-900'
                          : 'bg-amber-200 text-amber-900 border-amber-400'
                      }`}>
                        {humanReviewApproved ? 'CERTIFIED BY AUDITOR' : 'SIGNATURE REQUIRED'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-sans mt-2 mb-3">
                      {result.report.human_review_required
                        ? 'Mandatory Guardrail: Failure involves severe compliance risk (critical ePHI breach or confidence < 0.75). Physical auditor verification required.'
                        : 'Routine Automated Verification: Confidence threshold exceeded. Optional manual sign-off and regulatory notes ledger below.'}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Add QA Auditor verification notes / CAPA ticket reference..."
                        value={qaNotes}
                        onChange={(e) => setQaNotes(e.target.value)}
                        className="w-full bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-600"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={reviewOverride || result.report.overall_risk}
                          onChange={(e) => setReviewOverride(e.target.value as SeverityLevel)}
                          className="bg-white border border-slate-300 px-2 py-1.5 text-xs font-mono text-slate-800 focus:outline-none"
                        >
                          <option value="CRITICAL">Rating: CRITICAL</option>
                          <option value="HIGH">Rating: HIGH</option>
                          <option value="MEDIUM">Rating: MEDIUM</option>
                          <option value="LOW">Rating: LOW</option>
                        </select>
                        <button
                          onClick={() => setHumanReviewApproved(true)}
                          className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border cursor-pointer ${
                            humanReviewApproved
                              ? 'bg-teal-700 text-white border-teal-900'
                              : 'bg-slate-900 text-white border-slate-950 hover:bg-slate-800'
                          }`}
                        >
                          {humanReviewApproved ? 'SIGNED' : 'SIGN OFF AUDIT'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Immutable Agent Decision Audit Trail */}
                  <div className="pt-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Cryptographic Audit Trail
                    </span>
                    <div className="bg-slate-950 p-2.5 font-mono text-[11px] text-teal-300 space-y-1">
                      {result.report.audit_trail.map((line, idx) => (
                        <div key={idx} className="leading-tight">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
