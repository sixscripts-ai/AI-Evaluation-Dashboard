import React, { useEffect, useState } from 'react';
import { SectionHeader, Breadcrumb, StatusBadge, RegressionBadge, JsonBlock } from './UI.js';
import { 
  ShieldAlert, Clock, PlayCircle, Loader2, BarChart, ChevronDown, ChevronUp, CheckSquare, Zap, AlertTriangle, FileText, ChevronRight, Sparkles, Hash, Timer 
} from 'lucide-react';

interface Assertion {
  id: string;
  type: string;
  status: 'pass' | 'fail';
  expected: string;
  actual: string;
  explanation: string;
}

interface RunResultWithCase {
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
  assertions: Assertion[];
  notes?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  providerLatencyMs?: number;
  providerError?: string;
  createdAt: string;
  testCase?: {
    name: string;
    input: string;
    expectedOutput: string;
    requiredEvidence: string;
    difficulty: string;
  } | null;
}

interface RegressionWithCase {
  id: string;
  runId: string;
  caseId: string;
  regressionType: 'score_drop' | 'status_downgrade' | 'latency_increase' | 'evidence_lost';
  severity: 'low' | 'medium' | 'high';
  description: string;
  testCase?: {
    name: string;
  } | null;
}

interface RunDetailData {
  run: {
    id: string;
    suiteId: string;
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
    notes?: string;
    provider?: 'gemini' | 'groq' | 'openrouter' | 'simulated';
    runMode?: 'simulated' | 'real';
    totalInputTokens?: number;
    totalOutputTokens?: number;
    totalTokens?: number;
    errorMessage?: string;
  };
  suiteName: string;
  results: RunResultWithCase[];
  regressions: RegressionWithCase[];
}

interface RunDetailProps {
  runId: string;
  onNavigate: (route: string) => void;
}

export default function RunDetail({ runId, onNavigate }: RunDetailProps) {
  const [data, setData] = useState<RunDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track expanded rows for detailed assertion inspection
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/runs/${runId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve run details.');
        return res.json();
      })
      .then(resData => {
        setData(resData);
        // Expand first result by default for a neat preview layout
        if (resData.results && resData.results.length > 0) {
          setExpandedRows({ [resData.results[0].id]: true });
        }
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [runId]);

  const toggleRow = (resultId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [resultId]: !prev[resultId]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 font-mono text-xs">
        <Loader2 className="w-8 h-8 text-[#bef264] animate-spin" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Loading run...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12">
        <div className="bg-rose-950/20 text-rose-400 border border-rose-800/35 p-6 rounded-md font-mono text-xs max-w-lg">
          <ShieldAlert className="w-6 h-6 text-rose-500 mb-2" />
          <h3 className="font-bold uppercase tracking-wider mb-2">Failed to load run</h3>
          <p>{error || 'Run not found.'}</p>
          <button
            onClick={() => onNavigate('/runs')}
            className="mt-4 px-4 py-1.5 bg-zinc-900 border border-zinc-700 text-white font-mono rounded cursor-pointer"
          >
            Back to Runs
          </button>
        </div>
      </div>
    );
  }

  const { run, suiteName, results, regressions } = data;

  return (
    <div className="space-y-6 animate-fade-in font-mono text-xs">
      <Breadcrumb
        items={[
          { name: 'Dashboard', onClick: () => onNavigate('/') },
          { name: 'Suites', onClick: () => onNavigate('/suites') },
          { name: suiteName, onClick: () => onNavigate(`/suites/${run.suiteId}`) },
          { name: `Run v${run.systemVersion}` }
        ]}
      />

      {/* Run Header */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Suite</span>
            <h2 className="text-xl font-bold text-white font-sans tracking-tight">{suiteName}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate(`/suites/${run.suiteId}`)}
              className="px-4 py-1.5 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-mono rounded cursor-pointer"
            >
              Back to Suite
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[9px] text-zinc-500 block">Model</span>
            <span className="text-white font-bold leading-none mt-1 block">{run.modelName}</span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 block">Version</span>
            <span className="text-white font-bold leading-none mt-1 block">{run.systemVersion}</span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 block">Run ID</span>
            <span className="text-zinc-400 font-bold block overflow-ellipsis overflow-hidden mt-1">{run.id}</span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 block">Executed</span>
            <span className="text-zinc-400 block mt-1">{new Date(run.completedAt || run.startedAt).toLocaleString()}</span>
          </div>
        </div>

        {run.notes && (
          <div className="p-3.5 bg-black/40 rounded border border-white/5 text-zinc-300 max-w-4xl font-sans text-xs animate-fade-in">
            <span className="font-mono text-[9px] uppercase font-bold text-zinc-500 block mb-1">Notes</span>
            {run.notes}
          </div>
        )}

        {run.runMode === 'real' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/5">
            <div>
              <span className="text-[9px] text-zinc-500 block uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#bef264]" /> Provider
              </span>
              <span className="text-white font-bold leading-none mt-1 block uppercase">{run.provider}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 block uppercase">Mode</span>
              <span className="text-[#bef264] font-bold leading-none mt-1 block">Real model</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 block uppercase flex items-center gap-1">
                <Hash className="w-3 h-3" /> Total tokens
              </span>
              <span className="text-white font-bold leading-none mt-1 block">
                {typeof run.totalTokens === 'number' ? run.totalTokens.toLocaleString() : 'n/a'}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 block uppercase flex items-center gap-1">
                <Timer className="w-3 h-3" /> Avg latency
              </span>
              <span className="text-white font-bold leading-none mt-1 block">
                {run.averageLatencyMs ? `${run.averageLatencyMs}ms` : 'n/a'}
              </span>
            </div>
            {run.errorMessage && (
              <div className="col-span-full p-3 bg-amber-950/20 border border-amber-800/35 text-amber-400 rounded text-[11px] leading-relaxed font-sans">
                <strong className="block uppercase tracking-wider mb-1">Provider warning</strong>
                {run.errorMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Run summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
        <div className="p-4 rounded-lg border border-white/5 bg-zinc-900/50 backdrop-blur-sm text-center">
          <span className="text-[10px] text-zinc-500 block uppercase">Average Score</span>
          <span className={`text-2xl font-bold font-mono tracking-tight mt-1.5 block ${
            (run.averageScore || 0) >= 85
              ? 'text-emerald-400'
              : (run.averageScore || 0) >= 60
                ? 'text-amber-400'
                : 'text-rose-400'
          }`}>
            {run.averageScore !== undefined ? `${Math.round(run.averageScore)}%` : '---'}
          </span>
        </div>

        <div className="p-4 rounded-lg border border-white/5 bg-zinc-900/50 backdrop-blur-sm text-center">
          <span className="text-[10px] text-zinc-500 block uppercase">Results</span>
          <div className="flex justify-center items-baseline gap-1.5 mt-2 font-bold font-mono">
            <span className="text-emerald-400 text-lg">{run.passCount}</span>
            <span className="text-zinc-700">/</span>
            <span className="text-amber-400 text-lg">{run.partialCount}</span>
            <span className="text-zinc-700">/</span>
            <span className="text-rose-400 text-lg">{run.failCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-white/5 bg-zinc-900/50 backdrop-blur-sm text-center">
          <span className="text-[10px] text-zinc-500 block uppercase">Avg Latency</span>
          <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight mt-1.5 block">
            {run.averageLatencyMs ? `${run.averageLatencyMs}ms` : '---'}
          </span>
        </div>

        <div className="p-4 rounded-lg border border-[#bef264]/20 bg-[#bef264]/5 text-center">
          <span className="text-[10px] text-zinc-400 block uppercase">Regressions</span>
          <span className={`text-2xl font-bold tracking-tight mt-1.5 block ${
            regressions.length > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {regressions.length}
          </span>
        </div>
      </div>

      {/* Regressions block */}
      {regressions.length > 0 && (
        <div className="border border-rose-900/30 rounded-lg bg-rose-950/10 p-5 space-y-4">
          <h3 className="font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            Regressions Detected
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regressions.map((reg) => (
              <div
                key={reg.id}
                className="bg-zinc-950/40 p-4 border border-rose-900/15 rounded flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-white hover:underline cursor-pointer tracking-tight text-[11px]" onClick={() => onNavigate(`/cases/${reg.caseId}`)}>
                      {reg.testCase ? reg.testCase.name : 'Unknown test case'}
                    </span>
                    <span className={`px-1 rounded-[2px] font-bold text-[8px] tracking-wider text-rose-950 bg-rose-400`}>
                      {reg.severity}
                    </span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed font-sans text-xs">
                    {reg.description}
                  </p>
                </div>
                <div className="pt-3 text-[9px] font-mono font-bold text-zinc-500 border-t border-[#3a1d22]/40 mt-3">
                  Type: <span className="text-zinc-300">{reg.regressionType}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results table */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-black/20">
          <h3 className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
            Test Results
          </h3>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/30 text-zinc-400 border-b border-white/5 uppercase text-[10px] tracking-wider font-bold">
              <th className="py-3 px-6 w-8 shrink-0"></th>
              <th className="py-3 px-4">Test Case</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Score</th>
              <th className="py-3 px-4 text-center">Latency</th>
              <th className="py-3 px-4 text-center">Evidence</th>
              <th className="py-3 px-4 text-center">Assertions</th>
              <th className="py-3 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {results.map((res) => {
              const isExpanded = !!expandedRows[res.id];
              const passesCount = res.assertions.filter(a => a.status === 'pass').length;
              const assertionsTotal = res.assertions.length;

              return (
                <React.Fragment key={res.id}>
                  {/* Master row */}
                  <tr
                    className={`hover:bg-white/5 transition-colors ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                  >
                    <td className="py-3 px-6 text-center">
                      <button
                        onClick={() => toggleRow(res.id)}
                        className="text-zinc-500 hover:text-white cursor-pointer select-none border-0"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onNavigate(`/cases/${res.caseId}`)}
                        className="font-bold text-white hover:text-[#bef264] hover:underline font-sans text-left cursor-pointer"
                      >
                        {res.testCase ? res.testCase.name : 'Unknown case'}
                      </button>
                      <span className="block text-[10px] text-zinc-500 mt-1 max-w-sm truncate whitespace-nowrap">
                        ID: {res.caseId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={res.status} />
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={`text-base ${
                        res.score >= 85
                          ? 'text-emerald-400'
                          : res.score >= 60
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }`}>
                        {res.score}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-zinc-300">
                      {res.latencyMs ? `${res.latencyMs}ms` : '---'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {res.evidenceMatched ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                          Matched ({res.evidenceCoverageScore}%)
                        </span>
                      ) : (
                        <span className="text-zinc-600 block text-[10px]">Missed</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-mono text-sm font-semibold h-5 w-12 text-center rounded inline-block ${
                        passesCount === assertionsTotal
                          ? 'text-emerald-400'
                          : passesCount > 0
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }`}>
                        {passesCount} / {assertionsTotal}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => toggleRow(res.id)}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-500 border border-zinc-800 text-zinc-300 text-[10px] rounded transition-colors"
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <tr className="bg-black/30 border-y border-white/5 animate-fade-in">
                      <td colSpan={8} className="p-6 space-y-6">
                        {/* Input and output comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase text-zinc-500 font-bold block">Input</span>
                            <pre className="p-4 rounded border border-white/5 bg-black/50 overflow-y-auto whitespace-pre-wrap text-zinc-300 text-[11px] leading-relaxed">
                              <code>{res.testCase ? res.testCase.input : 'No input available'}</code>
                            </pre>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[9px] uppercase text-zinc-500 font-bold block flex items-center justify-between">
                              <span>Output</span>
                              {res.latencyMs && <span className="text-[#bef264] font-bold">{res.latencyMs}ms</span>}
                            </span>
                            <pre className="p-4 rounded border border-white/5 bg-black/50 overflow-y-auto whitespace-pre-wrap text-emerald-400 text-[11px] leading-relaxed">
                              <code>{res.actualOutput}</code>
                            </pre>
                            {res.failureReason && (
                              <p className="p-2.5 bg-rose-950/20 text-rose-400 border border-rose-900/15 rounded text-[10px]">
                                Failure: {res.failureReason}
                              </p>
                            )}
                            {res.providerError && (
                              <p className="p-2.5 bg-amber-950/20 text-amber-400 border border-amber-900/15 rounded text-[10px]">
                                Provider error: {res.providerError}
                              </p>
                            )}
                          </div>
                        </div>

                        {(res.inputTokens !== undefined || res.outputTokens !== undefined || res.providerLatencyMs !== undefined) && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded border border-white/5 bg-black/20 text-center">
                              <span className="text-[9px] text-zinc-500 block uppercase">Input tokens</span>
                              <span className="text-zinc-200 font-bold font-mono">{res.inputTokens ?? 'n/a'}</span>
                            </div>
                            <div className="p-3 rounded border border-white/5 bg-black/20 text-center">
                              <span className="text-[9px] text-zinc-500 block uppercase">Output tokens</span>
                              <span className="text-zinc-200 font-bold font-mono">{res.outputTokens ?? 'n/a'}</span>
                            </div>
                            <div className="p-3 rounded border border-white/5 bg-black/20 text-center">
                              <span className="text-[9px] text-zinc-500 block uppercase">Provider latency</span>
                              <span className="text-zinc-200 font-bold font-mono">{res.providerLatencyMs ? `${res.providerLatencyMs}ms` : 'n/a'}</span>
                            </div>
                          </div>
                        )}

                        {/* Expected vs Required Evidence */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 rounded border border-white/5 bg-black/20">
                            <span className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Expected Output</span>
                            <span className="text-zinc-300 block font-sans text-xs leading-relaxed">
                              {res.testCase ? res.testCase.expectedOutput : '---'}
                            </span>
                          </div>
                          <div className="p-4 rounded border border-white/5 bg-black/20">
                            <span className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Required Evidence</span>
                            <span className="text-zinc-300 block font-sans text-xs leading-relaxed">
                              {res.testCase ? res.testCase.requiredEvidence : '---'}
                            </span>
                          </div>
                        </div>

                        {/* Assertions */}
                        <div className="space-y-3">
                          <span className="text-[10px] uppercase text-zinc-500 font-bold block">Assertions ({res.assertions.length})</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {res.assertions.map((as) => (
                              <div
                                key={as.id}
                                className={`p-4 rounded border flex flex-col justify-between ${
                                  as.status === 'pass'
                                    ? 'bg-emerald-950/5 border-emerald-900/20'
                                    : 'bg-rose-950/5 border-rose-900/20'
                                }`}
                              >
                                <div>
                                  <div className="flex justify-between items-center mb-1.5 border-b border-zinc-800/20 pb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                                      {as.type}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[8px] tracking-wider ${
                                      as.status === 'pass'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {as.status === 'pass' ? 'Pass' : 'Fail'}
                                    </span>
                                  </div>
                                  <p className="font-sans leading-relaxed text-xs text-zinc-300">
                                    {as.explanation}
                                  </p>
                                </div>
                                <div className="mt-4 pt-2.5 border-t border-zinc-800/30 text-[9px] text-zinc-500 space-y-1">
                                  <div>Expected: <span className="text-zinc-300 bg-zinc-900 px-1 py-0.5 rounded">{as.expected}</span></div>
                                  <div>Actual: <span className="text-zinc-300 bg-zinc-900 px-1 py-0.5 rounded">{as.actual}</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
