import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  BookOpen,
  Scale,
  Sparkles,
  Tag,
  AlertOctagon,
  CheckCircle,
  FileCheck2,
  Sliders,
  Filter
} from 'lucide-react';
import { PolicyCorpusItem, SeverityLevel } from '../types';

export const PolicyCorpus: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyCorpusItem[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [testQuery, setTestQuery] = useState<string>('Unencrypted patient records in cleartext logs');
  const [testResults, setTestResults] = useState<{ id: string; score: number }[]>([]);

  useEffect(() => {
    fetch('/api/policies')
      .then((res) => res.json())
      .then((data: PolicyCorpusItem[]) => {
        setPolicies(data);
        runTestQuery(testQuery, data);
      })
      .catch((err) => console.error('Failed to load policies:', err));
  }, []);

  const runTestQuery = (query: string, corpus: PolicyCorpusItem[] = policies) => {
    if (!query.trim()) {
      setTestResults([]);
      return;
    }
    const qLower = query.toLowerCase();
    const scored = corpus.map((p) => {
      let score = 0;
      const combined = `${p.title} ${p.regulation} ${p.description} ${p.section}`.toLowerCase();
      if (Array.isArray(p.keywords)) {
        for (const kw of p.keywords) {
          if (qLower.includes(kw.toLowerCase())) score += 0.35;
        }
      }
      const tokens = qLower.split(/[\s,._\-/]+/).filter((t) => t.length > 3);
      for (const t of tokens) {
        if (combined.includes(t)) score += 0.15;
      }
      return { id: p.id, score: Math.min(Math.max(score, 0.05), 0.99) };
    });
    scored.sort((a, b) => b.score - a.score);
    setTestResults(scored);
  };

  const filtered = policies.filter((p) => {
    const q = filter.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.regulation.toLowerCase().includes(q) ||
      p.section.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  });

  const getImpactBadge = (impact: SeverityLevel) => {
    switch (impact) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-900 border-red-700 font-bold';
      case 'HIGH':
        return 'bg-amber-50 text-amber-900 border-amber-600 font-bold';
      case 'MEDIUM':
        return 'bg-yellow-50 text-yellow-900 border-yellow-600 font-bold';
      default:
        return 'bg-teal-50 text-teal-900 border-teal-700 font-bold';
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
                RAG KNOWLEDGE BASE
              </span>
              <span className="font-mono text-xs text-slate-500">
                CORPUS: /data/policies.json
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1 uppercase tracking-tight">
              Healthcare Regulatory Standards & Policy Corpus
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Statutory CFR citations, HIPAA privacy and security controls, FDA Part 11 integrity rules, and HL7 FHIR conformance criteria for RAG semantic matching.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 font-bold">
              {policies.length} STATUTES INDEXED
            </span>
          </div>
        </div>
      </div>

      {/* RAG Simulator Action Bar */}
      <div className="bg-white border border-slate-300 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-700" />
            Tool 03 // Vector RAG Retrieval Simulator (rag_policy_lookup)
          </span>
          <span className="font-mono text-[10px] text-slate-500">TF-IDF & KEYWORD SIMILARITY</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => {
              setTestQuery(e.target.value);
              runTestQuery(e.target.value);
            }}
            placeholder="Type query to simulate RAG retrieval (e.g. 'unencrypted ePHI', 'prescription audit missing')..."
            className="flex-1 bg-slate-50 border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-slate-600"
          />
          <button
            onClick={() => runTestQuery(testQuery)}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider border border-slate-950 cursor-pointer shrink-0"
          >
            COMPUTE RAG MATCH
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Top RAG Hits:</span>
            {testResults.slice(0, 3).map((r) => (
              <span
                key={r.id}
                className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 text-[11px] flex items-center gap-1.5"
              >
                <span className="font-bold text-slate-900">{r.id}</span>
                <span className="text-slate-400">|</span>
                <span className="font-bold text-teal-800">{(r.score * 100).toFixed(0)}% MATCH</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filter and Policy Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-white border border-slate-300 px-3 py-2">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter by regulation, CFR section, keywords..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 pl-8 pr-3 py-1 font-mono text-xs text-slate-900 focus:outline-none focus:border-slate-500"
            />
          </div>
          <span className="font-mono text-xs text-slate-500">{filtered.length} STATUTES DISPLAYED</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((policy) => {
            const testMatch = testResults.find((r) => r.id === policy.id);
            return (
              <div
                key={policy.id}
                className="bg-white border border-slate-300 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-3 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="px-1.5 py-0.2 bg-slate-900 text-white font-bold text-[10px]">
                          {policy.id}
                        </span>
                        <span className="text-slate-700 font-semibold uppercase">
                          {policy.regulation}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-950 mt-1 font-sans">
                        {policy.title}
                      </h3>
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                        STATUTE: {policy.section}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <span className={`inline-block px-2 py-0.5 border text-[10px] font-mono ${getImpactBadge(policy.compliance_impact)}`}>
                        {policy.compliance_impact} IMPACT
                      </span>
                      {testMatch && (
                        <div className="font-mono text-[10px] text-teal-800 font-bold bg-teal-50 border border-teal-600 px-1 py-0.2">
                          RAG: {(testMatch.score * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 space-y-3">
                  <p className="text-xs text-slate-800 leading-relaxed font-sans">
                    {policy.description}
                  </p>

                  <div className="border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono">
                    <span className="font-bold text-slate-900 block text-[10px] uppercase text-teal-900 mb-0.5">
                      Statutory Remediation Protocol:
                    </span>
                    <span className="text-slate-700 text-[11px] font-sans">
                      {policy.remediation}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1 font-mono text-[10px]">
                    {policy.keywords?.map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.2 bg-slate-100 border border-slate-300 text-slate-600">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
