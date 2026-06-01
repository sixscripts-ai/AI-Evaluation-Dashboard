import React, { useEffect, useState } from 'react';
import { 
  StatCard, SectionHeader, StatusBadge, EmptyState 
} from './UI.js';
import { 
  Layers, CheckSquare, Gauge, ShieldAlert, Clock, ArrowRight, Play, Loader2
} from 'lucide-react';

interface RecentRun {
  id: string;
  suiteId: string;
  suiteName: string;
  modelName: string;
  systemVersion: string;
  averageScore?: number;
  passCount: number;
  partialCount: number;
  failCount: number;
  averageLatencyMs?: number;
  startedAt: string;
  completedAt?: string;
  regressionCount?: number;
}

interface DashboardMetrics {
  totalSuites: number;
  totalTestCases: number;
  latestRunScore: number;
  passRate: number; // pass count
  partialRate: number; // partial count
  failRate: number; // fail count
  totalRegressions: number;
  averageLatency: number;
  recentRuns: RecentRun[];
}

interface DashboardProps {
  onNavigate: (route: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/dashboard')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch dashboard metrics.');
        return res.json();
      })
      .then(data => {
        setMetrics(data);
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
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Loading dashboard...</span>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="py-12">
        <div className="bg-rose-950/20 text-rose-400 border border-rose-800/35 p-6 rounded-md">
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider mb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            Failed to load dashboard
          </h3>
          <p className="text-xs font-mono text-zinc-300">{error || 'Could not connect to the API.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-xs font-mono rounded cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    totalSuites,
    totalTestCases,
    latestRunScore,
    passRate,
    partialRate,
    failRate,
    totalRegressions,
    averageLatency,
    recentRuns
  } = metrics;

  const totalResultsCount = passRate + partialRate + failRate;
  const passPercent = totalResultsCount ? Math.round((passRate / totalResultsCount) * 100) : 0;
  const partialPercent = totalResultsCount ? Math.round((partialRate / totalResultsCount) * 100) : 0;
  const failPercent = totalResultsCount ? Math.round((failRate / totalResultsCount) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionHeader
        title="Dashboard"
        subtitle="EvalBench is an evaluation dashboard for RAG answers, agent decisions, evidence coverage, assertions, and regression behavior across model runs."
        action={
          <button
            onClick={() => onNavigate('/runs')}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#bef264] text-black font-semibold text-xs font-mono hover:brightness-110 rounded-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(190,242,100,0.15)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            New Run
          </button>
        }
      />

      {/* Overview Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Eval Suites"
          value={totalSuites}
          icon={<Layers className="w-4 h-4 text-zinc-500" />}
          subtext="Active test cohorts"
        />
        <StatCard
          title="Test Cases"
          value={totalTestCases}
          icon={<CheckSquare className="w-4 h-4 text-zinc-500" />}
          subtext="Across all suites"
        />
        <StatCard
          title="Latest Score"
          value={`${latestRunScore}%`}
          highlight={true}
          icon={<Gauge className="w-4 h-4 text-[#bef264]" />}
          subtext="Most recent run"
        />
        <StatCard
          title="Regressions"
          value={totalRegressions}
          icon={<ShieldAlert className={`w-4 h-4 ${totalRegressions > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />}
          subtext={totalRegressions > 0 ? 'Needs review' : 'All clear'}
          trend={totalRegressions > 0 ? { value: `${totalRegressions} issues`, isPositive: false } : undefined}
        />
      </div>

      {/* Latency and Ratio analysis layer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Verification quality distribution */}
        <div className="lg:col-span-2 p-6 rounded-lg border border-white/5 bg-zinc-900/50 backdrop-blur-sm">
          <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-semibold mb-4">
            Assertion Results
          </h3>
          <div className="space-y-5">
            {/* Horizontal Stacked Bar */}
            <div className="h-6 rounded bg-zinc-900 border border-zinc-800 flex overflow-hidden">
              {passPercent > 0 && (
                <div
                  className="bg-emerald-500/80 hover:bg-emerald-500 text-[10px] text-emerald-950 font-bold flex items-center justify-center font-mono transition-colors"
                  style={{ width: `${passPercent}%` }}
                  title={`Pass: ${passRate} results (${passPercent}%)`}
                >
                  {passPercent >= 8 ? `${passPercent}%` : ''}
                </div>
              )}
              {partialPercent > 0 && (
                <div
                  className="bg-amber-500/80 hover:bg-amber-500 text-[10px] text-amber-950 font-bold flex items-center justify-center font-mono transition-colors"
                  style={{ width: `${partialPercent}%` }}
                  title={`Partial: ${partialRate} results (${partialPercent}%)`}
                >
                  {partialPercent >= 8 ? `${partialPercent}%` : ''}
                </div>
              )}
              {failPercent > 0 && (
                <div
                  className="bg-rose-500/80 hover:bg-rose-500 text-[10px] text-rose-950 font-bold flex items-center justify-center font-mono transition-colors"
                  style={{ width: `${failPercent}%` }}
                  title={`Fail: ${failRate} results (${failPercent}%)`}
                >
                  {failPercent >= 8 ? `${failPercent}%` : ''}
                </div>
              )}
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-[#121c16] border border-emerald-900/30 p-3 rounded flex flex-col">
                <span className="text-emerald-400 font-bold">Pass</span>
                <span className="text-xl font-bold mt-1">{passRate}</span>
                <span className="text-[10px] text-zinc-500">All assertions passed</span>
              </div>
              <div className="bg-[#1e1910] border border-amber-900/30 p-3 rounded flex flex-col">
                <span className="text-amber-400 font-bold">Partial</span>
                <span className="text-xl font-bold mt-1">{partialRate}</span>
                <span className="text-[10px] text-zinc-500">Some assertions passed</span>
              </div>
              <div className="bg-[#201114] border border-rose-900/30 p-3 rounded flex flex-col">
                <span className="text-rose-400 font-bold">Fail</span>
                <span className="text-xl font-bold mt-1">{failRate}</span>
                <span className="text-[10px] text-zinc-500">No assertions passed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Performance benchmarks */}
        <div className="p-6 rounded-lg border border-white/5 bg-zinc-900/50 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-semibold mb-4">
              Performance
            </h3>
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-[#bef264] shrink-0" />
              <div>
                <span className="text-[10px] font-mono text-zinc-500 block leading-tight">Average Latency</span>
                <span className="text-3xl font-bold font-mono text-white tracking-tight leading-none">
                  {averageLatency}ms
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-400 leading-relaxed font-sans">
              Average latency across all completed runs. SLA target: <span className="text-[#bef264] font-mono">1500ms</span>.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500">SLA Target</span>
              <span className="text-[#bef264] font-bold">1500ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Eval Runs segment */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/20">
          <h3 className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
            Recent Runs
          </h3>
          <button
            onClick={() => onNavigate('/runs')}
            className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer hover:underline"
          >
            All Runs <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentRuns.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No runs yet"
              description="Trigger a run from the Runs page to populate this view."
              action={
                <button
                  onClick={() => onNavigate('/runs')}
                  className="px-4 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded text-xs font-mono cursor-pointer"
                >
                  Trigger Run
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-black/30 text-zinc-400 border-b border-white/5 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-6">Suite</th>
                  <th className="py-3 px-4">Model / Version</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Pass / Partial / Fail</th>
                  <th className="py-3 px-4 text-center">Latency</th>
                  <th className="py-3 px-4 text-center text-zinc-400">Regressions</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-6">
                      <button
                        onClick={() => onNavigate(`/suites/${run.suiteId}`)}
                        className="font-bold text-white hover:text-[#bef264] text-left hover:underline cursor-pointer font-sans"
                      >
                        {run.suiteName}
                      </button>
                      <span className="block text-[10px] text-zinc-500 mt-0.5">ID: {run.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-300 font-bold block">{run.modelName}</span>
                      <span className="text-[10px] text-zinc-500 bg-white/5 px-1 py-0.5 rounded-sm">{run.systemVersion}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={`text-base ${
                        (run.averageScore || 0) >= 85
                          ? 'text-emerald-400'
                          : (run.averageScore || 0) >= 60
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }`}>
                        {run.averageScore !== undefined ? `${Math.round(run.averageScore)}%` : '---'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-emerald-400">{run.passCount}</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-amber-400">{run.partialCount}</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-rose-400">{run.failCount}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-zinc-300 font-mono">
                      {run.averageLatencyMs ? `${run.averageLatencyMs}ms` : '---'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(run.regressionCount || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/35 text-rose-400 text-[10px]">
                          {run.regressionCount} regressed
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px] font-bold">Stable</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => onNavigate(`/runs/${run.id}`)}
                        className="px-3 py-1 bg-zinc-900/80 border border-white/10 hover:border-[#bef264] text-[#bef264] text-[11px] rounded-sm transition-colors cursor-pointer"
                      >
                        View
                      </button>
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
