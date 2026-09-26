/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  FileCheck,
  Code,
  BookOpen,
  Terminal,
  Network,
  Cpu,
  CheckCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { AgentConsole } from './components/AgentConsole';
import { CodeExplorer } from './components/CodeExplorer';
import { PolicyCorpus } from './components/PolicyCorpus';
import { ApiWorkbench } from './components/ApiWorkbench';
import { ArchitectureRoadmap } from './components/ArchitectureRoadmap';

type Tab = 'console' | 'explorer' | 'corpus' | 'api' | 'architecture';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('console');
  const [serverOnline, setServerOnline] = useState<boolean>(true);
  const [activeAgents, setActiveAgents] = useState<string[]>(['TriageAgent', 'PolicyAgent', 'ReportAgent']);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'healthy') {
          setServerOnline(true);
          if (data.active_agents) setActiveAgents(data.active_agents);
        }
      })
      .catch(() => setServerOnline(false));
  }, []);

  const tabs: { id: Tab; index: string; label: string; icon: React.ElementType; tag: string }[] = [
    { id: 'console', index: '01', label: 'AUDIT WORKSPACE', icon: Activity, tag: 'MULTI-AGENT RUN' },
    { id: 'explorer', index: '02', label: 'PYTHON REPOSITORY', icon: Code, tag: 'ADK CODEBASE' },
    { id: 'corpus', index: '03', label: 'REGULATORY CORPUS', icon: BookOpen, tag: 'RAG DATABASE' },
    { id: 'api', index: '04', label: 'FASTAPI HARNESS', icon: Terminal, tag: 'REST + JWT' },
    { id: 'architecture', index: '05', label: 'SYSTEM ARCHITECTURE', icon: Network, tag: 'STAGES 1-5' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-teal-800 selection:text-white">
      {/* Institutional Master Header */}
      <header className="bg-slate-900 text-white border-b-2 border-slate-950 sticky top-0 z-50">
        {/* Top Control Bar */}
        <div className="border-b border-slate-800 px-4 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] font-bold text-teal-400 tracking-wider">
              REGULATORY COMPLIANCE SYSTEM
            </span>
            <span className="text-slate-600 font-mono">|</span>
            <span className="font-mono text-[11px] text-slate-300">
              AUDIT REF: <span className="text-white">HCQA-ORCH-2026-v1</span>
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 ${serverOnline ? 'bg-teal-400' : 'bg-red-500'}`} />
              <span className="text-slate-300">{serverOnline ? 'SYSTEM OPERATIONAL' : 'OFFLINE'}</span>
            </div>
            <span className="text-slate-700">|</span>
            <span>MODEL: GEMINI-3.8-FLASH</span>
            <span className="text-slate-700">|</span>
            <span>FRAMEWORK: GOOGLE ADK</span>
          </div>
        </div>

        {/* Primary Identity & Navigation Bar */}
        <div className="px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-700 text-white flex items-center justify-center border border-teal-500 shrink-0 font-mono font-bold text-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight uppercase">
                  Healthcare QA Agents
                </h1>
                <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 border border-slate-700">
                  STAGE 1 VERIFIED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-normal">
                Clinical test failure triage, healthcare regulatory policy assessment, and audit report generation
              </p>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <nav className="flex flex-wrap items-center gap-1 border-t lg:border-t-0 border-slate-800 pt-2 lg:pt-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-xs font-mono flex items-center gap-2 border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-950 border-white font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className={`text-[10px] ${isActive ? 'text-teal-700' : 'text-slate-500'}`}>
                    [{tab.index}]
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {activeTab === 'console' && <AgentConsole />}
        {activeTab === 'explorer' && <CodeExplorer />}
        {activeTab === 'corpus' && <PolicyCorpus />}
        {activeTab === 'api' && <ApiWorkbench />}
        {activeTab === 'architecture' && <ArchitectureRoadmap />}
      </main>

      {/* Institutional Legal & Audit Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs font-mono py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="text-white font-semibold">STANDARDS ENFORCED:</span>
            <span className="text-slate-400">HIPAA Security Rule (45 CFR § 164.312)</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">HIPAA Privacy Rule (45 CFR § 164.502)</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">FDA 21 CFR Part 11</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">HL7 FHIR R4 US Core</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>ACTIVE AGENTS: [3/3 READY]</span>
            <span className="text-slate-700">|</span>
            <span className="text-teal-400">SECURE HARNESS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
