import React, { useEffect, useState } from 'react';
import { SectionHeader, Breadcrumb, StatusBadge, RegressionBadge, JsonBlock } from './UI.js';
import { 
  ShieldAlert, Clock, PlayCircle, Loader2, BarChart, ChevronDown, ChevronUp, CheckSquare, Zap, AlertTriangle, FileText, ChevronRight 
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
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Compiling Telemetry Vectors...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12">
        <div className="bg-rose-950/20 text-rose-400 border border-rose-800/35 p-6 rounded-md font-mono text-xs max-w-lg">
          <ShieldAlert className="w-6 h-6 text-rose-500 mb-2" />
          <h3 className="font-bold uppercase tracking-wider mb-2">Telemetry Outage</h3>
          <p>{error || 'Requested model run details cannot be initialized.'}</p>
          <button 
            onClick={() => onNavigate('/runs')}
            className="mt-4 px-4 py-1.5 bg-zinc-900 border border-zinc-700 text-white font-mono rounded cursor-pointer"
          >
            ← Back to Runs History
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
          { name: 'Suites List', onClick: () => onNavigate('/suites') },
          { name: suiteName, onClick: () => onNavigate(`/suites/${run.suiteId}`) },
          { name: `Run Report [v-${run.systemVersion}]` }
        ]} 
      />

      {/* Header telemetry blocks */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Run Target Suite</span>
            <h2 className="text-xl font-bold text-white font-sans tracking-tight">{suiteName}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate(`/suites/${run.suiteId}`)}
              className="px-4 py-1.5 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-mono rounded cursor-pointer"
            >
              ← Open Suite Sand
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[9px] text-zinc-500 block">EVALUATED MODEL</span>
            <span className="text-white font-bold leading-none mt-1 block">{run.modelName}</span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 block">SYSTEM REVISION</span>
            <span className="text-white font-bold leading-none mt-1 block">{run.systemVersion}</span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 block">TELEMETRY ID</span>
            <span className="text-zinc-400 font-bold block overflow-ellipsis overflow-hidden mt-1">{run.id}</span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 block">DATE METRICS COMPILED</span>
            <span className="text-zinc-400 block mt-1">{new Date(run.completedAt || run.startedAt).toLocaleString()}</span>
          </div>
        </div>

        {run.notes && (
          <div className="p-3.5 bg-black/40 rounded border border-white/5 text-zinc-350 max-w-4xl font-sans text-xs animate-fade-in">
            <span className="font-mono text-[9px] uppercase font-bold text-zinc-500 block mb-1">RUN NOTES</span>
            {run.notes}
          </div>
        )}
      </div>

      {/* Run summaries overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
        <div className="p-4 rounded-lg border border-white/5 bg-zinc-900/50 backdrop-blur-sm text-center">
          <span className="text-[10px] text-zinc-500 block uppercase">AVERAGE RUN SCORE</span>
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
          <span className="text-[10px] text-zinc-500 block uppercase">RUN STATUS RATIO</span>
          <div className="flex justify-center items-baseline gap-1.5 mt-2 font-bold font-mono">
            <span className="text-emerald-400 text-lg">{run.passCount}✓</span>
            <span className="text-zinc-700">/</span>
            <span className="text-amber-400 text-lg">{run.partialCount}△</span>
            <span className="text-zinc-700">/</span>
            <span className="text-rose-400 text-lg">{run.failCount}✗</span>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-white/5 bg-zinc-900/50 backdrop-blur-sm text-center">
          <span className="text-[10px] text-zinc-500 block uppercase">AVG PIPELINE LATENCY</span>
          <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight mt-1.5 block">
            {run.averageLatencyMs ? `${run.averageLatencyMs}ms` : '---'}
          </span>
        </div>

        <div className="p-4 rounded-lg border border-[#bef264]/20 bg-[#bef264]/5 text-center shadow-[0_0_10px_rgba(190,242,100,0.03)]">
          <span className="text-[10px] text-zinc-400 block uppercase">REGRESSION FLAGS</span>
          <span className={`text-2xl font-bold tracking-tight mt-1.5 block ${
            regressions.length > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
          }`}>
            {regressions.length > 0 ? `⚠️ ${regressions.length} WARNINGS` : '✓ STABLE (0)'}
          </span>
        </div>
      </div>

      {/* Regression warnings detail block */}
      {regressions.length > 0 && (
        <div className="border border-rose-900/30 rounded-lg bg-rose-950/10 p-5 space-y-4">
          <h3 className="font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            CRITICAL DEGRADATION SUMMARY REPORT
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
                      {reg.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed font-sans text-xs">
                    {reg.description}
                  </p>
                </div>
                <div className="pt-3 uppercase text-[9px] font-mono font-bold text-zinc-500 border-t border-[#3a1d22]/40 mt-3">
                  ALERT CODE: <span className="text-zinc-300">{reg.regressionType}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Assertions Outcomes table */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-black/20">
          <h3 className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
            OUTCOMES & EXPLICIT ASSERTIONS TELEMETRY
          </h3>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/30 text-zinc-400 border-b border-white/5 uppercase text-[10px] tracking-wider font-bold">
              <th className="py-3 px-6 w-8 shrink-0"></th>
              <th className="py-3 px-4">Enrolled Test case</th>
              <th className="py-3 px-4 text-center">Outcome Status</th>
              <th className="py-3 px-4 text-center">Case Score</th>
              <th className="py-3 px-4 text-center">Latency</th>
              <th className="py-3 px-4 text-center">Grounding Citation</th>
              <th className="py-3 px-4 text-center">Assertion Rate</th>
              <th className="py-3 px-6 text-right">Expansion Detail</th>
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
                      <span className="block text-[10px] text-zinc-500 mt-1 uppercase max-w-sm truncate whitespace-nowrap">
                        Ref: {res.caseId}
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
                          ✓ KEY MATCHED ({res.evidenceCoverageScore}%)
                        </span>
                      ) : (
                        <span className="text-zinc-600 block text-[10px]">MISSED ✗</span>
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
                        {isExpanded ? 'Collapse' : 'Inspect'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Workspace */}
                  {isExpanded && (
                    <tr className="bg-black/30 border-y border-white/5 animate-fade-in">
                      <td colSpan={8} className="p-6 space-y-6">
                        {/* Prompt Input & Output Side-by-side comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase text-zinc-500 font-bold block">Input prompt supplied</span>
                            <pre className="p-4 rounded border border-white/5 bg-black/50 overflow-y-auto whitespace-pre-wrap text-zinc-300 text-[11px] leading-relaxed">
                              <code>{res.testCase ? res.testCase.input : 'Checking prompt details...'}</code>
                            </pre>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[9px] uppercase text-zinc-500 font-bold block flex items-center justify-between">
                              <span>Model Actual output Response</span>
                              {res.latencyMs && <span className="text-[#bef264] font-bold">⏱ {res.latencyMs}ms latency</span>}
                            </span>
                            <pre className="p-4 rounded border border-white/5 bg-black/50 overflow-y-auto whitespace-pre-wrap text-emerald-400 text-[11px] leading-relaxed">
                              <code>{res.actualOutput}</code>
                            </pre>
                            {res.failureReason && (
                              <p className="p-2.5 bg-rose-950/20 text-rose-400 border border-rose-900/15 rounded text-[10px]">
                                🚨 EXCEPTION CAUSE: {res.failureReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Comparative Requirements Target checklist */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 rounded border border-white/5 bg-black/20">
                            <span className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Expectation bounds metadata</span>
                            <span className="text-zinc-300 block font-sans text-xs leading-relaxed">
                              {res.testCase ? res.testCase.expectedOutput : '---'}
                            </span>
                          </div>
                          <div className="p-4 rounded border border-white/5 bg-black/20">
                            <span className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Required Grounding Context facts</span>
                            <span className="text-zinc-350 block font-sans text-xs leading-relaxed">
                              {res.testCase ? res.testCase.requiredEvidence : '---'}
                            </span>
                          </div>
                        </div>

                        {/* Concrete Assertions items lists */}
                        <div className="space-y-3">
                          <span className="text-[10px] uppercase text-zinc-500 font-bold block">Individual Assertions rules telemetry ({res.assertions.length})</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {res.assertions.map((as) => (
                              <div 
                                key={as.id} 
                                className={`p-4 rounded border flex flex-col justify-between ${
                                  as.status === 'pass' 
                                    ? 'bg-emerald-950/5 border-emerald-900/20 text-emerald-350' 
                                    : 'bg-rose-950/5 border-rose-900/20 text-rose-350'
                                }`}
                              >
                                <div>
                                  <div className="flex justify-between items-center mb-1.5 border-b border-zinc-800/20 pb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wide">
                                      {as.type.replace('_', ' ')}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[8px] tracking-wider ${
                                      as.status === 'pass' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {as.status === 'pass' ? 'PASSED ✓' : 'FAILED ✗'}
                                    </span>
                                  </div>
                                  <p className="font-sans leading-relaxed text-xs">
                                    {as.explanation}
                                  </p>
                                </div>
                                <div className="mt-4 pt-2.5 border-t border-zinc-850/30 text-[9px] text-zinc-500 space-y-1">
                                  <div>EXPECTED: <span className="text-zinc-350 bg-zinc-900 px-1 py-0.5 rounded">{as.expected}</span></div>
                                  <div>ACTUAL: <span className="text-zinc-350 bg-zinc-900 px-1 py-0.5 rounded">{as.actual}</span></div>
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
