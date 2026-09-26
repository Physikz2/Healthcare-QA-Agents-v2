import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google Gen AI client with recommended User-Agent header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Helper to safely call Gemini with a timeout
async function generateWithTimeout(prompt: string, timeoutMs: number = 6000): Promise<string | null> {
  if (!ai) return null;
  try {
    const aiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const result: any = await Promise.race([aiPromise, timeoutPromise]);
    return result?.text?.trim() || null;
  } catch (err) {
    console.warn('Gemini call error:', err);
    return null;
  }
}

// Load embedded healthcare policies
const policiesFilePath = path.join(process.cwd(), 'healthcare-qa-agents', 'data', 'policies.json');
let policiesCorpus: any[] = [];
try {
  if (fs.existsSync(policiesFilePath)) {
    policiesCorpus = JSON.parse(fs.readFileSync(policiesFilePath, 'utf8'));
  }
} catch (err) {
  console.error('Failed to load policies.json:', err);
}

// Helper: RAG Policy Retrieval
function retrievePolicies(queryText: string, topK: number = 3) {
  const query = queryText.toLowerCase();
  const scored = policiesCorpus.map((policy) => {
    let score = 0;
    const combined = `${policy.title} ${policy.regulation} ${policy.description} ${policy.section}`.toLowerCase();
    
    // Keyword matching
    if (Array.isArray(policy.keywords)) {
      for (const kw of policy.keywords) {
        if (query.includes(kw.toLowerCase())) {
          score += 0.35;
        }
      }
    }
    // Token overlap
    const tokens = query.split(/[\s,._\-/]+/).filter((t) => t.length > 3);
    for (const token of tokens) {
      if (combined.includes(token)) {
        score += 0.15;
      }
    }
    score = Math.min(Math.max(score, 0.1), 0.98);
    return {
      policy_id: policy.id,
      title: policy.title,
      regulation: policy.regulation,
      section: policy.section,
      similarity_score: parseFloat(score.toFixed(3)),
      remediation_hint: policy.remediation,
    };
  });

  scored.sort((a, b) => b.similarity_score - a.similarity_score);
  return scored.slice(0, topK);
}

// 1. Health Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    active_agents: ['TriageAgent', 'PolicyAgent', 'ReportAgent'],
    version: '1.0.0',
    gemini_connected: Boolean(apiKey),
  });
});

// 2. Token Generation Endpoint (JWT demo)
app.post('/api/token', (req: Request, res: Response) => {
  const { username = 'qa-engineer', role = 'qa_lead' } = req.body || {};
  // Create demo token
  const token = `demo-jwt-${Buffer.from(JSON.stringify({ sub: username, role, exp: Date.now() + 3600000 })).toString('base64url')}`;
  res.json({
    access_token: token,
    token_type: 'bearer',
    expires_in_minutes: 60,
  });
});

// 3. Triage Agent Endpoint
app.post('/api/triage', async (req: Request, res: Response) => {
  const { raw_log = '', structured_data = null, test_suite = 'e2e-healthcare-suite', test_case_id = 'TC-001' } = req.body;
  const content = (raw_log + ' ' + (structured_data ? JSON.stringify(structured_data) : '')).trim();

  if (!content) {
    return res.status(400).json({ error: 'Triage input must contain either raw_log or structured_data.' });
  }

  // Parse log keywords
  const targets = ['phi', 'ssn', 'mrn', 'patient', 'encryption', 'tls', 'ssl', 'plaintext', 'audit', 'fhir', 'hl7', 'consent', 'unauthorized', 'forbidden', 'breach'];
  const detectedKeywords = targets.filter((kw) => content.toLowerCase().includes(kw));

  // Determine Severity and Category
  let severity = 'LOW';
  let category = 'FUNCTIONAL_BUG';
  let confidence = 0.78;

  const lower = content.toLowerCase();
  if (lower.includes('phi') || lower.includes('ssn') || lower.includes('mrn') || lower.includes('breach')) {
    severity = 'CRITICAL';
    category = 'PHI_LEAK';
    confidence = 0.94;
  } else if (lower.includes('tls') || lower.includes('encryption') || lower.includes('ssl') || lower.includes('plaintext')) {
    severity = 'CRITICAL';
    category = 'ENCRYPTION_DEFECT';
    confidence = 0.92;
  } else if (lower.includes('audit') || lower.includes('timestamp') || lower.includes('signature')) {
    severity = 'HIGH';
    category = 'AUDIT_FAILURE';
    confidence = 0.88;
  } else if (lower.includes('fhir') || lower.includes('hl7') || lower.includes('consent') || lower.includes('403')) {
    severity = 'HIGH';
    category = 'FHIR_COMPLIANCE';
    confidence = 0.90;
  } else if (lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('rbac')) {
    severity = 'HIGH';
    category = 'ACCESS_CONTROL';
    confidence = 0.86;
  }

  let errorSnippet = content.split('\n').slice(0, 10).join('\n');
  let failingComponent = 'ehr.clinical.service';
  const compMatch = content.match(/(?:GET|POST|PUT|DELETE)\s+([/\w\-\.]+)/) || content.match(/\[([a-zA-Z0-9\-]+)\]/);
  if (compMatch) {
    failingComponent = compMatch[1];
  }

  // Gemini AI reasoning if available
  let summary = `Detected ${category} with severity ${severity} in component ${failingComponent}.`;
  const aiSummary = await generateWithTimeout(`You are the Triage Agent in a Healthcare QA system. Reason about this test failure:
Component: ${failingComponent}
Category: ${category}
Severity: ${severity}
Keywords: ${detectedKeywords.join(', ')}
Log Snippet:
${errorSnippet.slice(0, 500)}

Provide a concise, 2-sentence clinical diagnostic summary explaining the root issue and immediate risk.`);
  
  if (aiSummary) {
    summary = aiSummary;
    confidence = Math.min(confidence + 0.04, 0.99);
  }

  const triageResult = {
    severity,
    category,
    summary,
    confidence: parseFloat(confidence.toFixed(2)),
    requires_human_review: confidence < 0.75 || severity === 'CRITICAL',
    parsed_details: {
      error_message: content.split('\n')[0].slice(0, 200),
      stack_trace_snippet: errorSnippet,
      failing_component: failingComponent,
      detected_keywords: detectedKeywords,
    },
    agent_timestamp: new Date().toISOString(),
  };

  res.json(triageResult);
});

// 4. Policy Agent Endpoint
app.post('/api/assess', async (req: Request, res: Response) => {
  const triageResult = req.body;
  if (!triageResult || !triageResult.category) {
    return res.status(400).json({ error: 'Valid TriageResult payload required.' });
  }

  const queryText = `${triageResult.category} ${triageResult.summary} ${triageResult.parsed_details?.detected_keywords?.join(' ') || ''}`;
  const matchedPolicies = retrievePolicies(queryText, 3);

  const complianceFlags = matchedPolicies.map(
    (m) => `${m.regulation}: ${m.section} violation risk (${m.policy_id})`
  );

  let riskLevel = triageResult.severity === 'CRITICAL' ? 'CRITICAL' : matchedPolicies.length > 0 ? 'HIGH' : 'MEDIUM';

  let summary = `Assessed ${matchedPolicies.length} regulatory standards. Found compliance exposure under ${matchedPolicies[0]?.regulation || 'HIPAA Standard'}.`;

  const policyList = matchedPolicies.map((p) => `${p.policy_id} (${p.regulation} - ${p.section})`).join('; ');
  const aiPolicySummary = await generateWithTimeout(`You are the Policy Agent in a Healthcare QA system.
Triage Result:
Severity: ${triageResult.severity}
Category: ${triageResult.category}
Summary: ${triageResult.summary}
Matched Healthcare Regulations: ${policyList}

Write a 2-sentence regulatory compliance impact assessment explaining the legal risk and HIPAA/FDA/FHIR compliance exposure.`);

  if (aiPolicySummary) {
    summary = aiPolicySummary;
  }

  const confidence = matchedPolicies.length > 0 ? 0.91 : 0.68;
  const assessment = {
    matched_policies: matchedPolicies,
    compliance_flags: complianceFlags,
    risk_level: riskLevel,
    summary,
    confidence,
    requires_human_review: confidence < 0.75 || riskLevel === 'CRITICAL',
    agent_timestamp: new Date().toISOString(),
  };

  res.json(assessment);
});

// 5. Report Agent Endpoint
app.post('/api/report', async (req: Request, res: Response) => {
  const { triage_result, policy_assessment } = req.body;
  if (!triage_result || !policy_assessment) {
    return res.status(400).json({ error: 'Payload must contain triage_result and policy_assessment.' });
  }

  const reportId = `QA-REP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const hierarchy: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const triageScore = hierarchy[triage_result.severity] || 1;
  const policyScore = hierarchy[policy_assessment.risk_level] || 1;
  const overallRisk = triageScore >= policyScore ? triage_result.severity : policy_assessment.risk_level;

  const baseRecommendations: string[] = [];
  if (Array.isArray(policy_assessment.matched_policies)) {
    for (const match of policy_assessment.matched_policies) {
      baseRecommendations.push(`[${match.regulation} - ${match.section}] ${match.remediation_hint}`);
    }
  }
  baseRecommendations.push(
    `Quarantine component '${triage_result.parsed_details?.failing_component || 'service'}' and execute regression test suite covering ${triage_result.category}.`
  );

  let finalRecommendations = baseRecommendations;
  const aiReportText = await generateWithTimeout(`You are the Report Agent for a Healthcare QA system.
Failure: ${triage_result.summary}
Severity: ${triage_result.severity}
Risk Level: ${policy_assessment.risk_level}
Matched Policies: ${policy_assessment.compliance_flags?.join(', ')}

Provide 3 prioritized, executive remediation action steps for healthcare engineering and compliance teams. Format as a bullet list.`);

  if (aiReportText) {
    const lines = aiReportText
      .split('\n')
      .map((l) => l.replace(/^[-*•0-9.]+\s*/, '').trim())
      .filter((l) => l.length > 10);
    if (lines.length > 0) {
      finalRecommendations = Array.from(new Set([...lines.slice(0, 3), ...baseRecommendations]));
    }
  }

  const now = new Date().toISOString();
  const auditTrail = [
    `[${triage_result.agent_timestamp || now}] TRIAGE_AGENT assessed severity=${triage_result.severity} confidence=${triage_result.confidence}`,
    `[${policy_assessment.agent_timestamp || now}] POLICY_AGENT matched ${policy_assessment.matched_policies?.length || 0} policies risk=${policy_assessment.risk_level} confidence=${policy_assessment.confidence}`,
    `[${now}] REPORT_AGENT compiled report ${reportId} overall_risk=${overallRisk} human_review=${triage_result.requires_human_review || policy_assessment.requires_human_review}`,
  ];

  res.json({
    report_id: reportId,
    generated_at: now,
    triage_summary: triage_result.summary,
    policy_summary: policy_assessment.summary,
    overall_risk: overallRisk,
    recommendations: finalRecommendations.slice(0, 5),
    human_review_required: Boolean(triage_result.requires_human_review || policy_assessment.requires_human_review),
    audit_trail: auditTrail,
  });
});

// End-to-end full pipeline execution endpoint
app.post('/api/run-pipeline', async (req: Request, res: Response) => {
  const { raw_log = '', structured_data = null, test_suite = 'e2e-healthcare-suite', test_case_id = 'TC-E2E-001' } = req.body;
  const content = (raw_log + ' ' + (structured_data ? JSON.stringify(structured_data) : '')).trim();

  if (!content) {
    return res.status(400).json({ error: 'Failure content must not be empty.' });
  }

  const startTime = Date.now();
  const logs: { agent: string; message: string; timestamp: string; type: 'info' | 'tool' | 'guardrail' | 'reasoning' }[] = [];

  // Step 1: Orchestrator dispatch to Triage Agent
  logs.push({
    agent: 'Orchestrator',
    message: `Received test failure event for test suite '${test_suite}', test case '${test_case_id}'. Dispatching to Triage Agent.`,
    timestamp: new Date().toISOString(),
    type: 'info',
  });

  // Triage Tool 1: log_parser
  const targets = ['phi', 'ssn', 'mrn', 'patient', 'encryption', 'tls', 'ssl', 'plaintext', 'audit', 'fhir', 'hl7', 'consent', 'unauthorized', 'forbidden', 'breach'];
  const detectedKeywords = targets.filter((kw) => content.toLowerCase().includes(kw));
  let failingComponent = 'ehr.clinical.service';
  const compMatch = content.match(/(?:GET|POST|PUT|DELETE)\s+([/\w\-\.]+)/) || content.match(/\[([a-zA-Z0-9\-]+)\]/);
  if (compMatch) failingComponent = compMatch[1];

  logs.push({
    agent: 'TriageAgent',
    message: `Tool 'log_parser' executed: component='${failingComponent}', detected keywords=[${detectedKeywords.join(', ')}]`,
    timestamp: new Date().toISOString(),
    type: 'tool',
  });

  // Triage Tool 2: severity_classifier
  let severity = 'LOW';
  let category = 'FUNCTIONAL_BUG';
  let confidence = 0.78;
  const lower = content.toLowerCase();

  if (lower.includes('phi') || lower.includes('ssn') || lower.includes('mrn') || lower.includes('breach')) {
    severity = 'CRITICAL';
    category = 'PHI_LEAK';
    confidence = 0.94;
  } else if (lower.includes('tls') || lower.includes('encryption') || lower.includes('ssl') || lower.includes('plaintext')) {
    severity = 'CRITICAL';
    category = 'ENCRYPTION_DEFECT';
    confidence = 0.92;
  } else if (lower.includes('audit') || lower.includes('timestamp') || lower.includes('signature')) {
    severity = 'HIGH';
    category = 'AUDIT_FAILURE';
    confidence = 0.88;
  } else if (lower.includes('fhir') || lower.includes('hl7') || lower.includes('consent') || lower.includes('403')) {
    severity = 'HIGH';
    category = 'FHIR_COMPLIANCE';
    confidence = 0.90;
  } else if (lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('rbac')) {
    severity = 'HIGH';
    category = 'ACCESS_CONTROL';
    confidence = 0.86;
  }

  logs.push({
    agent: 'TriageAgent',
    message: `Tool 'severity_classifier' executed: severity=${severity}, category=${category}, baseline_confidence=${confidence}`,
    timestamp: new Date().toISOString(),
    type: 'tool',
  });

  let triageSummary = `Failure in ${failingComponent}: identified ${category} with severity ${severity}.`;
  const aiTriageSummary = await generateWithTimeout(`You are the Triage Agent in a Healthcare QA system. Reason about this test failure:
Component: ${failingComponent}
Category: ${category}
Severity: ${severity}
Keywords: ${detectedKeywords.join(', ')}
Log Snippet:
${content.slice(0, 500)}

Provide a concise, 2-sentence clinical diagnostic summary explaining the root issue and immediate risk.`);

  if (aiTriageSummary) {
    triageSummary = aiTriageSummary;
    confidence = Math.min(confidence + 0.04, 0.99);
    logs.push({
      agent: 'TriageAgent',
      message: `Gemini AI reasoning applied: "${triageSummary.slice(0, 120)}..."`,
      timestamp: new Date().toISOString(),
      type: 'reasoning',
    });
  }

  const requiresHumanTriage = confidence < 0.75 || severity === 'CRITICAL';
  logs.push({
    agent: 'TriageAgent',
    message: `Guardrails check: confidence=${confidence.toFixed(2)}, human_review_required=${requiresHumanTriage}`,
    timestamp: new Date().toISOString(),
    type: 'guardrail',
  });

  const triageResult = {
    severity,
    category,
    summary: triageSummary,
    confidence: parseFloat(confidence.toFixed(2)),
    requires_human_review: requiresHumanTriage,
    parsed_details: {
      error_message: content.split('\n')[0].slice(0, 200),
      stack_trace_snippet: content.split('\n').slice(0, 8).join('\n'),
      failing_component: failingComponent,
      detected_keywords: detectedKeywords,
    },
    agent_timestamp: new Date().toISOString(),
  };

  // Step 2: Policy Agent
  logs.push({
    agent: 'Orchestrator',
    message: `Passing TriageResult to Policy Agent for regulatory compliance RAG lookup.`,
    timestamp: new Date().toISOString(),
    type: 'info',
  });

  const queryText = `${triageResult.category} ${triageResult.summary} ${detectedKeywords.join(' ')}`;
  const matchedPolicies = retrievePolicies(queryText, 3);

  logs.push({
    agent: 'PolicyAgent',
    message: `Tool 'rag_policy_lookup' retrieved ${matchedPolicies.length} relevant healthcare regulations from embedded policies.json`,
    timestamp: new Date().toISOString(),
    type: 'tool',
  });

  const complianceFlags = matchedPolicies.map(
    (m) => `${m.regulation}: ${m.section} violation risk (${m.policy_id})`
  );

  let riskLevel = triageResult.severity === 'CRITICAL' ? 'CRITICAL' : matchedPolicies.length > 0 ? 'HIGH' : 'MEDIUM';
  let policySummary = `Assessed ${matchedPolicies.length} regulatory standards. Potential exposure under ${matchedPolicies[0]?.regulation || 'HIPAA Standards'}.`;

  const policyList = matchedPolicies.map((p) => `${p.policy_id} (${p.regulation} - ${p.section})`).join('; ');
  const aiPolicySummary = await generateWithTimeout(`You are the Policy Agent in a Healthcare QA system.
Triage Result:
Severity: ${triageResult.severity}
Category: ${triageResult.category}
Summary: ${triageResult.summary}
Matched Healthcare Regulations: ${policyList}

Write a 2-sentence regulatory compliance impact assessment explaining the legal risk and HIPAA/FDA/FHIR compliance exposure.`);

  if (aiPolicySummary) {
    policySummary = aiPolicySummary;
    logs.push({
      agent: 'PolicyAgent',
      message: `Gemini AI compliance reasoning applied: "${policySummary.slice(0, 120)}..."`,
      timestamp: new Date().toISOString(),
      type: 'reasoning',
    });
  }

  const policyConfidence = matchedPolicies.length > 0 ? 0.91 : 0.68;
  const requiresHumanPolicy = policyConfidence < 0.75 || riskLevel === 'CRITICAL';
  logs.push({
    agent: 'PolicyAgent',
    message: `Guardrails check: risk_level=${riskLevel}, policy_confidence=${policyConfidence}, human_review_required=${requiresHumanPolicy}`,
    timestamp: new Date().toISOString(),
    type: 'guardrail',
  });

  const policyAssessment = {
    matched_policies: matchedPolicies,
    compliance_flags: complianceFlags,
    risk_level: riskLevel,
    summary: policySummary,
    confidence: policyConfidence,
    requires_human_review: requiresHumanPolicy,
    agent_timestamp: new Date().toISOString(),
  };

  // Step 3: Report Agent
  logs.push({
    agent: 'Orchestrator',
    message: `Passing Triage and Policy assessments to Report Agent for synthesis.`,
    timestamp: new Date().toISOString(),
    type: 'info',
  });

  const reportId = `QA-REP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const hierarchy: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const triageScore = hierarchy[triageResult.severity] || 1;
  const policyScore = hierarchy[policyAssessment.risk_level] || 1;
  const overallRisk = triageScore >= policyScore ? triageResult.severity : policyAssessment.risk_level;

  const baseRecommendations: string[] = [];
  for (const match of matchedPolicies) {
    baseRecommendations.push(`[${match.regulation} - ${match.section}] ${match.remediation_hint}`);
  }
  baseRecommendations.push(
    `Quarantine component '${failingComponent}' and execute automated regression suite covering ${triageResult.category}.`
  );

  let finalRecommendations = baseRecommendations;
  const aiReportText = await generateWithTimeout(`You are the Report Agent for a Healthcare QA system.
Failure: ${triageResult.summary}
Severity: ${triageResult.severity}
Risk Level: ${policyAssessment.risk_level}
Matched Policies: ${complianceFlags.join(', ')}

Provide 3 prioritized, executive remediation action steps for healthcare engineering and compliance teams. Format as a bullet list.`);

  if (aiReportText) {
    const lines = aiReportText
      .split('\n')
      .map((l) => l.replace(/^[-*•0-9.]+\s*/, '').trim())
      .filter((l) => l.length > 10);
    if (lines.length > 0) {
      finalRecommendations = Array.from(new Set([...lines.slice(0, 3), ...baseRecommendations]));
    }
  }

  const now = new Date().toISOString();
  const auditTrail = [
    `[${triageResult.agent_timestamp}] TRIAGE_AGENT assessed severity=${triageResult.severity} confidence=${triageResult.confidence}`,
    `[${policyAssessment.agent_timestamp}] POLICY_AGENT matched ${matchedPolicies.length} policies risk=${policyAssessment.risk_level} confidence=${policyAssessment.confidence}`,
    `[${now}] REPORT_AGENT compiled report ${reportId} overall_risk=${overallRisk} human_review=${requiresHumanTriage || requiresHumanPolicy}`,
  ];

  logs.push({
    agent: 'ReportAgent',
    message: `Tool 'report_formatter' generated report ${reportId} with ${finalRecommendations.length} remediation actions.`,
    timestamp: new Date().toISOString(),
    type: 'tool',
  });

  const finalReport = {
    report_id: reportId,
    generated_at: now,
    triage_summary: triageResult.summary,
    policy_summary: policyAssessment.summary,
    overall_risk: overallRisk,
    recommendations: finalRecommendations.slice(0, 5),
    human_review_required: requiresHumanTriage || requiresHumanPolicy,
    audit_trail: auditTrail,
  };

  const totalTimeMs = Date.now() - startTime;
  logs.push({
    agent: 'Orchestrator',
    message: `Multi-agent QA pipeline completed in ${totalTimeMs}ms. Status: SUCCESS`,
    timestamp: new Date().toISOString(),
    type: 'info',
  });

  res.json({
    execution_time_ms: totalTimeMs,
    triage: triageResult,
    policy: policyAssessment,
    report: finalReport,
    logs,
  });
});

// 6. Get Embedded Policy Corpus
app.get('/api/policies', (_req: Request, res: Response) => {
  res.json(policiesCorpus);
});

// 7. Get Python Repository Files for Code Explorer
app.get('/api/repo-files', (_req: Request, res: Response) => {
  const baseDir = path.join(process.cwd(), 'healthcare-qa-agents');
  const files: { path: string; name: string; category: string; content: string }[] = [];

  function walk(dir: string, rel: string = '') {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const relPath = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        if (!ent.name.startsWith('.') && ent.name !== '__pycache__') {
          walk(full, relPath);
        }
      } else {
        let cat = 'config';
        if (relPath.startsWith('agents/')) cat = 'agents';
        else if (relPath.startsWith('tools/')) cat = 'tools';
        else if (relPath.startsWith('models/')) cat = 'models';
        else if (relPath.startsWith('api/')) cat = 'api';
        else if (relPath.startsWith('tests/')) cat = 'tests';
        else if (relPath.startsWith('data/')) cat = 'data';
        else if (relPath.includes('Dockerfile') || relPath.includes('docker-compose') || relPath.includes('.github')) cat = 'devops';

        files.push({
          path: relPath,
          name: ent.name,
          category: cat,
          content: fs.readFileSync(full, 'utf8'),
        });
      }
    }
  }

  walk(baseDir);
  res.json(files);
});

// Dev / Prod Vite server mounting
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Healthcare QA Agents server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
