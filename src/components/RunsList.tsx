import React, { useEffect, useState } from 'react';
import { SectionHeader, EmptyState } from './UI.js';
import { PlayCircle, ShieldAlert, Clock, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

interface RunJoined {
  id: string;
  suiteId: string;
  suiteName: string;
  modelName: string;
  systemVersion: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  averageScore?: number;
  passCount: number;
  partialCount: number;
  failCount: number;
  averageLatencyMs?: number;
  regressionCount: number;
  notes?: string;
  provider?: 'gemini' | 'groq' | 'openrouter' | 'simulated';
  runMode?: 'simulated' | 'real';
  totalTokens?: number;
}

interface RunsListProps {
  onNavigate: (route: string) => void;
}

export default function RunsList({ onNavigate }: RunsListProps) {
  const [runs, setRuns] = useState<RunJoined[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/runs')
      .then(res => {
        if (!res.ok) throw new Error('Unresolved request: Unable to retrieve runs logs.');
        return res.json();
      })
      .then(data => {
        setRuns(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#bef264] animate-spin" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Loading runs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-mono text-xs">
      <SectionHeader
        title="Runs"
        subtitle="A chronological log of evaluation runs across all suites. Compare versions and detect regressions."
      />

      {error && (
        <div className="bg-rose-950/20 border border-rose-800/35 p-5 text-rose-400 rounded flex gap-3 text-xs font-mono">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider block mb-1">Failed to load runs</span>
            {error}
          </div>
        </div>
      )}

      {runs.length === 0 ? (
        <EmptyState
          title="No runs yet"
          description="Run a suite to see it appear here. Each run captures model, version, score, and regression status."
          action={
            <button
              onClick={() => onNavigate('/suites')}
              className="px-4 py-1.5 bg-[#bef264] text-black font-semibold font-mono rounded cursor-pointer hover:brightness-110 transition-all"
            >
              Go to Suites
            </button>
          }
        />
      ) : (
        <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/20">
            <h3 className="text-xs text-zinc-300 font-bold uppercase tracking-wider">
              All Runs ({runs.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/30 text-zinc-400 border-b border-white/5 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-6">Suite</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Pass / Partial / Fail</th>
                  <th className="py-3 px-4 text-center">Avg Latency</th>
                  <th className="py-3 px-4 text-center">Regressions</th>
                  <th className="py-3 px-4">Executed</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {runs.map((rn) => (
                  <tr key={rn.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-6">
                      <button
                        onClick={() => onNavigate(`/suites/${rn.suiteId}`)}
                        className="font-bold text-white hover:text-[#bef264] hover:underline cursor-pointer font-sans text-left"
                      >
                        {rn.suiteName}
                      </button>
                      <span className="block text-[10px] text-zinc-500 mt-0.5">ID: {rn.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-300 font-bold">{rn.modelName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded font-bold text-zinc-400 text-[10px]">
                        {rn.systemVersion}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {rn.runMode === 'real' ? (
                        <span className="px-2 py-0.5 bg-[#bef264]/10 border border-[#bef264]/30 text-[#bef264] text-[10px] font-bold rounded uppercase">
                          Real · {rn.provider || 'provider'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold rounded uppercase">
                          Simulated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={`text-sm ${
                        (rn.averageScore || 0) >= 85
                          ? 'text-emerald-400'
                          : (rn.averageScore || 0) >= 60
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }`}>
                        {rn.averageScore !== undefined ? `${Math.round(rn.averageScore)}%` : '---'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5 font-bold font-mono">
                        <span className="text-emerald-400">{rn.passCount}</span>
                        <span className="text-zinc-600 font-sans">/</span>
                        <span className="text-amber-500">{rn.partialCount}</span>
                        <span className="text-zinc-600 font-sans">/</span>
                        <span className="text-rose-500">{rn.failCount}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-zinc-300">
                      {rn.averageLatencyMs ? `${rn.averageLatencyMs}ms` : '---'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {rn.regressionCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-bold">
                          {rn.regressionCount}
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px] font-bold">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {new Date(rn.startedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => onNavigate(`/runs/${rn.id}`)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-500 border border-zinc-800 text-[#bef264] text-[10px] rounded transition-colors cursor-pointer font-bold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
