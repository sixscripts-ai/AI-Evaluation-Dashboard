import React, { useEffect, useState } from 'react';
import { SectionHeader, Breadcrumb, StatusBadge, EmptyState } from './UI.js';
import { 
  ArrowLeft, FileText, CheckCircle2, ShieldAlert, Cpu, Layers, Tag, Bookmark, Calendar, Loader2 
} from 'lucide-react';

interface CaseDetailData {
  testCase: {
    id: string;
    suiteId: string;
    name: string;
    input: string;
    expectedOutput: string;
    requiredEvidence: string;
    tags: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  suite: {
    id: string;
    name: string;
    description: string;
    project: string;
  };
  sources: {
    id: string;
    caseId: string;
    title: string;
    sourceType: string;
    url?: string;
    excerpt: string;
  }[];
  history: {
    id: string;
    runId: string;
    caseId: string;
    actualOutput: string;
    status: 'pass' | 'partial' | 'fail';
    score: number;
    latencyMs?: number;
    failureReason?: string;
    evidenceMatched: boolean;
    evidenceCoverageScore?: number;
    notes?: string;
    runModel: string;
    runVersion: string;
    runDate: string;
  }[];
}

interface CaseDetailProps {
  caseId: string;
  onNavigate: (route: string) => void;
}

export default function CaseDetail({ caseId, onNavigate }: CaseDetailProps) {
  const [data, setData] = useState<CaseDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/cases/${caseId}`)
      .then(res => {
        if (!res.ok) throw new Error('Query Exception: Unable to locate specified checklist rule.');
        return res.json();
      })
      .then(resData => {
        setData(resData);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [caseId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#bef264] animate-spin" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Retrieving Assertion Criteria...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12">
        <div className="bg-rose-950/20 text-rose-400 border border-rose-800/35 p-6 rounded-md font-mono text-xs max-w-lg">
          <ShieldAlert className="w-6 h-6 text-rose-500 mb-2" />
          <h3 className="font-bold uppercase tracking-wider mb-2">Unresolved Checklist ID</h3>
          <p>{error || 'Requested test case data cannot be compiled.'}</p>
          <button 
            onClick={() => onNavigate('/')}
            className="mt-4 px-4 py-1.5 bg-zinc-900 border border-zinc-700 text-white font-mono rounded cursor-pointer"
          >
            ← Back to Command Console
          </button>
        </div>
      </div>
    );
  }

  const { testCase, suite, sources, history } = data;

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      <Breadcrumb 
        items={[
          { name: 'Dashboard', onClick: () => onNavigate('/') },
          { name: 'Suites List', onClick: () => onNavigate('/suites') },
          { name: suite.name, onClick: () => onNavigate(`/suites/${suite.id}`) },
          { name: `Case Details` }
        ]} 
      />

      {/* Case Header Panel */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 lg:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold tracking-wider ${
                testCase.difficulty === 'easy' 
                  ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-905/30' 
                  : testCase.difficulty === 'medium' 
                    ? 'bg-amber-950/20 text-amber-500 border border-amber-905/30'
                    : 'bg-rose-950/20 text-rose-400 border border-rose-905/30'
              }`}>
                Difficulty: {testCase.difficulty}
              </span>
              <span className="text-xs font-mono text-zinc-500 uppercase">
                ID Reference: <span className="text-zinc-300 font-bold">{testCase.id}</span>
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white leading-snug">{testCase.name}</h1>
          </div>

          <div className="flex shrink-0">
            <button
              onClick={() => onNavigate(`/suites/${suite.id}`)}
              className="px-4 py-1.5 border border-zinc-850 hover:border-zinc-700 text-xs font-mono rounded-sm text-zinc-300 cursor-pointer"
            >
              ← Back to Suite Workspace
            </button>
          </div>
        </div>

        {/* Case Tags list */}
        <div className="flex flex-wrap gap-2 pt-2">
          {testCase.tags.map((tg, idx) => (
            <span key={idx} className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded font-mono">
              #{tg}
            </span>
          ))}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border ${
            testCase.isActive 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-zinc-800 text-zinc-500 border-zinc-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${testCase.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            {testCase.isActive ? 'ACTIVE IN FLOWS' : 'ARCHIVED RULE'}
          </span>
        </div>

        <div className="pt-4 border-t border-white/5 flex flex-wrap gap-x-8 gap-y-2 text-xs font-mono text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-zinc-600 font-bold" />
            Target Suite: <span className="text-[#bef264] hover:underline cursor-pointer font-bold" onClick={() => onNavigate(`/suites/${suite.id}`)}>{suite.name}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-zinc-600" />
            Registered: <span className="text-zinc-300">{new Date(testCase.createdAt).toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Case Core Definition Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
        {/* Prompt Input variables */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 space-y-3">
            <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Input Payload Parameters</h3>
            <pre className="p-4 rounded-lg bg-black/50 border border-white/5 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              <code>{testCase.input}</code>
            </pre>
          </div>

          {/* Expected Output vs Evidence Target Criteria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 space-y-3">
              <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#bef264]" />
                Target Outputs
              </h3>
              <p className="text-zinc-300 leading-relaxed font-sans text-sm">
                {testCase.expectedOutput}
              </p>
            </div>

            <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 space-y-3">
              <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-amber-500" />
                Evidence Grounding
              </h3>
              <p className="text-zinc-300 leading-relaxed font-sans text-sm">
                {testCase.requiredEvidence}
              </p>
            </div>
          </div>

          {/* Notes description card */}
          {testCase.notes && (
            <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 space-y-1.5">
              <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-bold font-sans">Developer annotations</h3>
              <p className="text-zinc-400 font-sans text-sm leading-relaxed">{testCase.notes}</p>
            </div>
          )}
        </div>

        {/* Evidence Sources Side panel */}
        <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col space-y-4">
          <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Anchored Repository Sources</h3>
          
          {sources.length === 0 ? (
            <p className="text-zinc-500 font-sans leading-relaxed text-sm">
              No evidence reference sources linked. Grounding evaluation checks may log safety failures.
            </p>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-1 max-h-[24rem] pr-2">
              {sources.map((src) => (
                <div key={src.id} className="p-4 bg-black/20 border border-white/5 rounded space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white block truncate leading-tight max-w-[12rem]">
                      {src.title}
                    </span>
                    <span className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9px] uppercase">
                      {src.sourceType}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    "{src.excerpt}"
                  </p>
                  {src.url && (
                    <a 
                      href={src.url} 
                      target="_blank" 
                      referrerPolicy="no-referrer"
                      className="text-[#bef264] text-[10px] items-center gap-1 hover:underline inline-flex font-sans"
                    >
                      Inspect Source URI ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historic run results list */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden animate-fade-in">
        <div className="px-6 py-4 border-b border-white/5 bg-black/20">
          <h3 className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
            Comparative Deployment Verification History
          </h3>
        </div>

        {history.length === 0 ? (
          <div className="p-6">
            <EmptyState 
              title="No run logs recorded yet" 
              description="Execute an evaluation pass inside the suite detail workstation to generate comparative graphs." 
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-black/30 text-zinc-400 border-b border-white/5 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-6">Model ID</th>
                  <th className="py-3 px-4">Software Version</th>
                  <th className="py-3 px-4 text-center">Outcome</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Latency</th>
                  <th className="py-3 px-4 text-center">Grounding Link</th>
                  <th className="py-3 px-6">Output Text</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((his) => (
                  <tr key={his.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-6">
                      <span className="font-bold text-white block">{his.runModel}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Result ID: {his.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded font-bold text-zinc-300">
                        {his.runVersion}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={his.status} />
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={`text-sm ${
                        his.score >= 85 
                          ? 'text-emerald-400' 
                          : his.score >= 60 
                            ? 'text-amber-400' 
                            : 'text-rose-400'
                      }`}>
                        {his.score}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-zinc-300">
                      {his.latencyMs ? `${his.latencyMs}ms` : '---'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {his.evidenceMatched ? (
                        <span className="text-emerald-400 text-[10px]">CITED ✓</span>
                      ) : (
                        <span className="text-zinc-600 block text-[10px]">---</span>
                      )}
                    </td>
                    <td className="py-3 px-6 font-sans text-zinc-400 max-w-sm">
                      <div className="truncate text-xs leading-tight" title={his.actualOutput}>
                        {his.actualOutput}
                      </div>
                      {his.failureReason && (
                        <span className="block text-[10px] text-rose-400 mt-1 uppercase font-mono">
                          🚨 EXCEPTION: {his.failureReason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
