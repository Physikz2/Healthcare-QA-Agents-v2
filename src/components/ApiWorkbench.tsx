import React, { useState } from 'react';
import {
  Key,
  Send,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Code2,
  AlertCircle,
  Lock,
  FileText
} from 'lucide-react';

interface Endpoint {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  authRequired: boolean;
  defaultPayload?: any;
}

const ENDPOINTS: Endpoint[] = [
  {
    id: 'health',
    method: 'GET',
    path: '/api/health',
    description: 'System health check, active agent registry, and version metadata.',
    authRequired: false,
  },
  {
    id: 'token',
    method: 'POST',
    path: '/api/token',
    description: 'Generate a signed JWT bearer token for demo authentication and automated testing.',
    authRequired: false,
    defaultPayload: {
      username: 'qa-lead-auditor',
      role: 'clinical_qa_lead',
    },
  },
  {
    id: 'triage',
    method: 'POST',
    path: '/api/triage',
    description: 'Invoke Triage Agent to classify raw failure logs and determine severity.',
    authRequired: true,
    defaultPayload: {
      raw_log: 'PatientDataLeakException: Plaintext SSN revealed in debug logs: ssn=***-**-9912 on POST /api/v1/patients',
      test_suite: 'ehr-compliance-e2e',
      test_case_id: 'TC-EHR-042',
    },
  },
  {
    id: 'assess',
    method: 'POST',
    path: '/api/assess',
    description: 'Invoke Policy Agent with TriageResult to evaluate healthcare regulatory violations.',
    authRequired: true,
    defaultPayload: {
      severity: 'CRITICAL',
      category: 'PHI_LEAK',
      summary: 'Plaintext SSN exposed during patient data synchronization.',
      confidence: 0.94,
      requires_human_review: true,
      parsed_details: {
        error_message: 'PatientDataLeakException',
        stack_trace_snippet: 'POST /api/v1/patients returned unencrypted payload',
        failing_component: 'ehr.patient.sync',
        detected_keywords: ['phi', 'ssn', 'patient'],
      },
    },
  },
  {
    id: 'report',
    method: 'POST',
    path: '/api/report',
    description: 'Invoke Report Agent with triage & policy data to compile an executive QAReport.',
    authRequired: true,
    defaultPayload: {
      triage_result: {
        severity: 'CRITICAL',
        category: 'PHI_LEAK',
        summary: 'Plaintext SSN exposed during patient data synchronization.',
        confidence: 0.94,
        requires_human_review: true,
        parsed_details: {
          error_message: 'PatientDataLeakException',
          stack_trace_snippet: 'Unencrypted payload in logs',
          failing_component: 'ehr.patient.sync',
          detected_keywords: ['phi', 'ssn'],
        },
      },
      policy_assessment: {
        matched_policies: [
          {
            policy_id: 'HIPAA-PRIV-002',
            title: 'Minimum Necessary and De-Identification',
            regulation: 'HIPAA Privacy Rule',
            section: '45 CFR 164.502(b)',
            similarity_score: 0.92,
            remediation_hint: 'Apply automated regex masking on all log streams.',
          },
        ],
        compliance_flags: ['HIPAA Privacy Rule: 45 CFR 164.502(b) violation risk'],
        risk_level: 'CRITICAL',
        summary: 'Direct HIPAA breach identified. Immediate remediation mandated.',
        confidence: 0.95,
        requires_human_review: true,
      },
    },
  },
];

export const ApiWorkbench: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(ENDPOINTS[0]);
  const [jwtToken, setJwtToken] = useState<string>('');
  const [payloadStr, setPayloadStr] = useState<string>(
    JSON.stringify(ENDPOINTS[0].defaultPayload || {}, null, 2)
  );
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  const handleSelectEndpoint = (ep: Endpoint) => {
    setSelectedEndpoint(ep);
    setPayloadStr(JSON.stringify(ep.defaultPayload || {}, null, 2));
    setResponseStatus(null);
    setResponseData(null);
    setLatency(null);
  };

  const handleFetchDemoToken = async () => {
    try {
      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'qa-lead-auditor', role: 'compliance_lead' }),
      });
      const data = await res.json();
      if (data.access_token) {
        setJwtToken(data.access_token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeApiCall = async () => {
    setLoading(true);
    setResponseStatus(null);
    setResponseData(null);
    const start = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (selectedEndpoint.authRequired && jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers,
      };

      if (selectedEndpoint.method === 'POST') {
        options.body = payloadStr;
      }

      const res = await fetch(selectedEndpoint.path, options);
      const end = performance.now();
      setLatency(Math.round(end - start));
      setResponseStatus(res.status);

      const data = await res.json();
      setResponseData(data);

      if (selectedEndpoint.id === 'token' && data.access_token) {
        setJwtToken(data.access_token);
      }
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData({ error: err.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white border border-slate-300 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-900 text-white">
                REST TEST HARNESS
              </span>
              <span className="font-mono text-xs text-slate-500">
                SPEC: FASTAPI + PYJWT AUTHENTICATION
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1 uppercase tracking-tight">
              FastAPI Endpoint & JWT Security Test Workbench
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Live HTTP execution interface for triage, policy, and report agent endpoints. Strictly verifies Bearer token authentication and Pydantic validation.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            {!jwtToken ? (
              <button
                onClick={handleFetchDemoToken}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider border border-slate-950 flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-teal-400" />
                GENERATE DEMO JWT TOKEN
              </button>
            ) : (
              <span className="px-2.5 py-1 bg-teal-50 border border-teal-700 text-teal-900 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                BEARER TOKEN ACTIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Endpoint List vs Right Request / Response Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Endpoint Navigation */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-300">
            <div className="bg-slate-100 border-b border-slate-300 px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                REST API ENDPOINT DIRECTORY
              </span>
              <span className="font-mono text-[10px] text-slate-500">[5 ROUTES]</span>
            </div>

            <div className="p-2 space-y-1.5">
              {ENDPOINTS.map((ep) => {
                const isSelected = selectedEndpoint.id === ep.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => handleSelectEndpoint(ep)}
                    className={`w-full text-left p-2.5 border transition-all cursor-pointer font-sans ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-950'
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.2 font-bold text-[10px] border ${
                          ep.method === 'GET'
                            ? isSelected ? 'border-teal-400 text-teal-300 bg-teal-950/40' : 'border-slate-400 text-slate-800 bg-slate-100'
                            : isSelected ? 'border-teal-400 text-teal-300 bg-teal-950/40' : 'border-slate-900 text-slate-950 bg-slate-200'
                        }`}>
                          {ep.method}
                        </span>
                        <span className="font-bold">{ep.path}</span>
                      </div>
                      {ep.authRequired && (
                        <span className={`text-[10px] ${isSelected ? 'text-amber-300' : 'text-amber-700'}`}>
                          [JWT]
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                      {ep.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active JWT Token Details */}
          <div className="bg-white border border-slate-300 p-3 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <span className="font-bold text-slate-900 uppercase">
                Active Authorization Header
              </span>
              <button
                onClick={handleFetchDemoToken}
                className="text-[10px] text-teal-800 font-bold uppercase underline hover:text-teal-900 cursor-pointer"
              >
                Refresh Token
              </button>
            </div>
            <div className="bg-slate-950 text-teal-300 p-2 font-mono text-[10px] break-all border border-slate-800 leading-tight">
              {jwtToken ? `Bearer ${jwtToken}` : 'No active token. Click "GENERATE DEMO JWT TOKEN".'}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Console */}
        <div className="lg:col-span-8 space-y-4">
          {/* Request Header & Body */}
          <div className="bg-white border border-slate-300">
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 bg-slate-900 text-white font-bold text-[10px]">
                  {selectedEndpoint.method}
                </span>
                <span className="font-bold text-slate-900">{selectedEndpoint.path}</span>
                {selectedEndpoint.authRequired && (
                  <span className="text-amber-800 font-bold text-[10px] bg-amber-50 border border-amber-600 px-1 py-0.2">
                    AUTH: BEARER JWT MANDATORY
                  </span>
                )}
              </div>

              <button
                onClick={executeApiCall}
                disabled={loading}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider border border-slate-950 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-teal-400" />
                {loading ? 'TRANSMITTING...' : 'DISPATCH REQUEST'}
              </button>
            </div>

            {selectedEndpoint.method === 'POST' && (
              <div className="p-3">
                <span className="font-mono text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Request Payload (Pydantic Input Contract)
                </span>
                <textarea
                  rows={8}
                  value={payloadStr}
                  onChange={(e) => setPayloadStr(e.target.value)}
                  className="w-full bg-slate-950 text-teal-300 font-mono text-xs p-3 border border-slate-800 focus:outline-none focus:border-slate-500 resize-none leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Response Inspector */}
          <div className="bg-white border border-slate-300">
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-slate-900 uppercase">
                HTTP Response Payload
              </span>

              <div className="flex items-center gap-3">
                {responseStatus !== null && (
                  <span className={`px-2 py-0.5 border text-xs font-bold ${
                    responseStatus < 300
                      ? 'bg-teal-50 border-teal-700 text-teal-900'
                      : 'bg-red-50 border-red-700 text-red-900'
                  }`}>
                    HTTP {responseStatus}
                  </span>
                )}
                {latency !== null && (
                  <span className="text-slate-600 text-xs">
                    {latency} ms
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-950 min-h-[220px]">
              {responseData ? (
                <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-14 font-mono text-xs text-slate-600">
                  Awaiting request transmission. Click "DISPATCH REQUEST" to verify endpoint response.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
