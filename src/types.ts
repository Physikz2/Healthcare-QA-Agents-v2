export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FailureCategory =
  | 'PHI_LEAK'
  | 'ENCRYPTION_DEFECT'
  | 'AUDIT_FAILURE'
  | 'FHIR_COMPLIANCE'
  | 'ACCESS_CONTROL'
  | 'FUNCTIONAL_BUG'
  | 'DATA_INTEGRITY'
  | 'OTHER';

export interface ParsedLogDetails {
  error_message: string;
  stack_trace_snippet: string;
  failing_component: string;
  detected_keywords: string[];
}

export interface TriageResult {
  severity: SeverityLevel;
  category: FailureCategory;
  summary: string;
  confidence: number;
  requires_human_review: boolean;
  parsed_details: ParsedLogDetails;
  agent_timestamp: string;
}

export interface PolicyMatch {
  policy_id: string;
  title: string;
  regulation: string;
  section: string;
  similarity_score: number;
  remediation_hint: string;
}

export interface PolicyAssessment {
  matched_policies: PolicyMatch[];
  compliance_flags: string[];
  risk_level: SeverityLevel;
  summary: string;
  confidence: number;
  requires_human_review: boolean;
  agent_timestamp: string;
}

export interface QAReport {
  report_id: string;
  generated_at: string;
  triage_summary: string;
  policy_summary: string;
  overall_risk: SeverityLevel;
  recommendations: string[];
  human_review_required: boolean;
  audit_trail: string[];
}

export interface AgentExecutionLog {
  agent: string;
  message: string;
  timestamp: string;
  type: 'info' | 'tool' | 'guardrail' | 'reasoning';
}

export interface PipelineExecutionResult {
  execution_time_ms: number;
  triage: TriageResult;
  policy: PolicyAssessment;
  report: QAReport;
  logs: AgentExecutionLog[];
}

export interface PolicyCorpusItem {
  id: string;
  title: string;
  regulation: string;
  section: string;
  description: string;
  keywords: string[];
  compliance_impact: SeverityLevel;
  remediation: string;
}

export interface RepoFileItem {
  path: string;
  name: string;
  category: string;
  content: string;
}
