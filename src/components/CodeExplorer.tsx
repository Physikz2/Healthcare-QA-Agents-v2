import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileCode,
  Copy,
  Check,
  Search,
  FileText,
  Boxes,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  Code2
} from 'lucide-react';
import { RepoFileItem } from '../types';

export const CodeExplorer: React.FC = () => {
  const [files, setFiles] = useState<RepoFileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepoFileItem | null>(null);
  const [search, setSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    fetch('/api/repo-files')
      .then((res) => res.json())
      .then((data: RepoFileItem[]) => {
        setFiles(data);
        if (data.length > 0) {
          const defaultFile = data.find((f) => f.path.includes('triage_agent.py')) || data[0];
          setSelectedFile(defaultFile);
        }
      })
      .catch((err) => console.error('Failed to load repo files:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyCode = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.path.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || f.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: 'ALL MODULES', count: files.length },
    { id: 'agents', label: 'AGENTS (3)', count: files.filter(f => f.category === 'agents').length },
    { id: 'tools', label: 'TOOLS (4)', count: files.filter(f => f.category === 'tools').length },
    { id: 'models', label: 'SCHEMAS', count: files.filter(f => f.category === 'models').length },
    { id: 'api', label: 'FASTAPI & AUTH', count: files.filter(f => f.category === 'api').length },
    { id: 'tests', label: 'PYTEST SUITE', count: files.filter(f => f.category === 'tests').length },
    { id: 'devops', label: 'DEVOPS / CI', count: files.filter(f => f.category === 'devops').length },
  ];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white border border-slate-300 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-900 text-white">
                CODE REPOSITORY
              </span>
              <span className="font-mono text-xs text-slate-500">
                PATH: /healthcare-qa-agents/
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1 uppercase tracking-tight">
              Python 3.11+ ADK Multi-Agent Source Tree
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Strict modular structure adhering to clinical QA constraints: under 200 lines per file, full typing, docstrings, and Pydantic v2 schemas.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 font-bold">
              {files.length} REPO FILES
            </span>
          </div>
        </div>
      </div>

      {/* Filter Action Panel */}
      <div className="flex flex-wrap gap-1 bg-white border border-slate-300 p-1.5 font-mono text-xs">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-3 py-1.5 border transition-all cursor-pointer font-bold ${
              activeCategory === c.id
                ? 'bg-slate-900 text-white border-slate-950'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      {/* Split Code Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Directory Index */}
        <div className="lg:col-span-4 bg-white border border-slate-300 flex flex-col h-[650px]">
          <div className="p-2 border-b border-slate-300 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search file path..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-300 pl-8 pr-2.5 py-1.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 font-mono text-xs">
            {loading ? (
              <div className="p-6 text-center text-slate-500">Loading codebase modules...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No matching files found.</div>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = selectedFile?.path === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white font-bold'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-teal-400' : 'text-slate-500'}`} />
                      <span className="truncate">{file.path}</span>
                    </div>
                    <span className={`text-[10px] px-1 border uppercase shrink-0 ml-2 ${
                      isSelected ? 'border-teal-500 bg-teal-950/40 text-teal-300' : 'border-slate-200 text-slate-500 bg-slate-50'
                    }`}>
                      {file.category}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Code Inspection Pane */}
        <div className="lg:col-span-8 bg-white border border-slate-300 flex flex-col h-[650px]">
          {selectedFile ? (
            <>
              {/* Inspection Header */}
              <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="font-bold text-slate-900">{selectedFile.path}</span>
                  <span className="text-slate-500 font-normal">
                    ({selectedFile.content.split('\n').length} lines · {selectedFile.content.length} bytes)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase font-bold bg-white border border-slate-300 px-2 py-0.5 text-slate-800">
                    {selectedFile.name.endsWith('.py')
                      ? 'PYTHON 3.11+'
                      : selectedFile.name.endsWith('.json')
                      ? 'JSON SPEC'
                      : selectedFile.name.endsWith('.yml') || selectedFile.name.endsWith('.yaml')
                      ? 'YAML CI'
                      : 'CONFIG'}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-teal-700" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY SOURCE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Source Viewer */}
              <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-900 bg-slate-950">
                <pre className="table w-full text-slate-200">
                  {selectedFile.content.split('\n').map((line, idx) => (
                    <div key={idx} className="table-row hover:bg-slate-900">
                      <span className="table-cell select-none pr-4 text-right text-slate-600 text-[11px] w-12 border-r border-slate-800 mr-3">
                        {idx + 1}
                      </span>
                      <span className="table-cell pl-3 whitespace-pre font-mono">
                        {line}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs font-mono text-slate-500">
              Select a module from the directory index
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
