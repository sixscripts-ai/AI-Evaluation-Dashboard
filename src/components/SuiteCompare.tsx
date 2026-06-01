import React, { useEffect, useState } from 'react';
import { 
  Breadcrumb, StatusBadge, EmptyState, SectionHeader
} from './UI.js';
import { 
  ArrowLeft, Cpu, Calendar, Loader2, CheckCircle2, AlertTriangle, Info, Sparkles, BarChart2, Copy, Check, Download, ExternalLink, Flame, ShieldCheck, Zap, Activity
} from 'lucide-react';
import { 
  computeRunSummaries, 
  buildCaseComparisonRows, 
  detectDisagreements, 
  diagnoseWinner, 
  RunSummary, 
  CaseComparisonRow, 
  Disagreement, 
  DiagnosisPanel 
} from '../lib/comparisons.js';
import { 
  generateMarkdownReport, 
  generateJSONReport 
} from '../lib/report-export.js';
import { EvalSuite, EvalCase, EvalRun, EvalResult } from '../types.js';

interface SuiteCompareProps {
  suiteId: string;
  onNavigate: (route: string) => void;
}

export default function SuiteCompare({ suiteId, onNavigate }: SuiteCompareProps) {
  const [suite, setSuite] = useState<EvalSuite | null>(null);
  const [cases, setCases] = useState<EvalCase[]>([]);
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [runResults, setRunResults] = useState<Record<string, EvalResult[]>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingResults, setIsFetchingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Expanded actual output state for the case comparison table
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});

  // 1. Fetch suite and runs
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/suites/${suiteId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve suite metadata.');
        return res.json();
      })
      .then(data => {
        setSuite(data.suite);
        setCases(data.cases);
        
        // Filter out incomplete/failed runs if needed, but keeping all completed runs
        const completed = (data.runs || []).filter((r: EvalRun) => r.status === 'completed');
        setRuns(completed);
        
        // Pre-select the two most recent runs by default
        if (completed.length >= 2) {
          const sorted = [...completed].sort((a, b) => 
            new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
          );
          setSelectedRunIds([sorted[0].id, sorted[1].id]);
        }
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [suiteId]);

  // 2. Fetch detailed results for selected runs in parallel
  useEffect(() => {
    if (selectedRunIds.length === 0) return;
    
    // Check if we already have the results for all selected runs
    const missingRunIds = selectedRunIds.filter(id => !runResults[id]);
    if (missingRunIds.length === 0) return;

    setIsFetchingResults(true);
    Promise.all(
      missingRunIds.map(runId => 
        fetch(`/api/runs/${runId}`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to load details for run ${runId}`);
            return res.json();
          })
          .then(data => ({ runId, results: data.results as EvalResult[] }))
      )
    )
      .then(fetchedResults => {
        setRunResults(prev => {
          const updated = { ...prev };
          fetchedResults.forEach(({ runId, results }) => {
            updated[runId] = results;
          });
          return updated;
        });
        setIsFetchingResults(false);
      })
      .catch(err => {
        console.error('Error fetching run details:', err);
        setIsFetchingResults(false);
      });
  }, [selectedRunIds, runResults]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#bef264] animate-spin" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Loading Comparison Suite...</span>
      </div>
    );
  }

  if (error || !suite) {
    return (
      <div className="py-12">
        <div className="bg-rose-950/20 text-rose-400 border border-rose-800/35 p-6 rounded-md font-mono text-xs max-w-lg">
          <AlertTriangle className="w-6 h-6 text-rose-500 mb-2" />
          <h3 className="font-bold uppercase tracking-wider mb-2">Error loading suite details</h3>
          <p>{error || 'Suite not found.'}</p>
          <button
            onClick={() => onNavigate('/suites')}
            className="mt-4 px-4 py-1.5 bg-zinc-900 border border-zinc-700 text-white font-mono rounded cursor-pointer"
          >
            Back to Suites
          </button>
        </div>
      </div>
    );
  }

  // Handle run selection toggles
  const handleToggleRun = (runId: string) => {
    setSelectedRunIds(prev => {
      if (prev.includes(runId)) {
        return prev.filter(id => id !== runId);
      }
      if (prev.length >= 4) {
        alert('You can select a maximum of 4 runs for comparison.');
        return prev;
      }
      return [...prev, runId];
    });
  };

  // Filter completed runs list
  const completedRuns = runs.filter(r => r.status === 'completed');

  // Compute calculated comparison values
  const activeSelectedRuns = completedRuns.filter(r => selectedRunIds.includes(r.id));
  const activeSelectedResults = Object.fromEntries(
    Object.entries(runResults).filter(([runId]) => selectedRunIds.includes(runId))
  ) as Record<string, EvalResult[]>;

  const runSummaries = computeRunSummaries(activeSelectedRuns);
  const comparisonRows = buildCaseComparisonRows(cases, activeSelectedResults, selectedRunIds);
  const disagreements = detectDisagreements(cases, activeSelectedResults, activeSelectedRuns);
  const diagnosis = diagnoseWinner(runSummaries, disagreements);

  // Markdown Report Copy Handler
  const handleCopyMarkdown = () => {
    const md = generateMarkdownReport(suite.name, runSummaries, comparisonRows, disagreements, diagnosis);
    navigator.clipboard.writeText(md)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy markdown report:', err);
      });
  };

  // JSON Report Download Handler
  const handleDownloadJSON = () => {
    const jsonStr = generateJSONReport(suite.name, runSummaries, comparisonRows, disagreements, diagnosis);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evalbench-compare-${suite.id}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleExpandCell = (caseId: string, runId: string) => {
    const key = `${caseId}-${runId}`;
    setExpandedCells(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in text-zinc-100">
      <Breadcrumb
        items={[
          { name: 'Dashboard', onClick: () => onNavigate('/') },
          { name: 'Suites', onClick: () => onNavigate('/suites') },
          { name: suite.name, onClick: () => onNavigate(`/suites/${suite.id}`) },
          { name: 'Compare Runs' }
        ]}
      />

      {/* Header */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#bef264]/10 text-[#bef264] border border-[#bef264]/20 rounded text-[10px] font-mono uppercase tracking-wider font-semibold">
                PROVIDER COMPARISON
              </span>
              <span className="text-xs font-mono text-zinc-500">
                Suite: <span className="text-zinc-300">{suite.name}</span>
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">Compare Evaluation Runs</h1>
          </div>

          <button
            onClick={() => onNavigate(`/suites/${suite.id}`)}
            className="flex items-center gap-2 px-4 py-1.5 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Suite Detail
          </button>
        </div>
        <p className="text-sm text-zinc-400 font-sans max-w-4xl">
          Evaluate how different models, providers, or prompt profiles stack up against the same benchmark cases. Compare latency, accuracy rates, and output assertions to find the best match for your workload.
        </p>
      </div>

      {/* 1. Selector UI */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
              Select Completed Runs to Compare ({selectedRunIds.length} / 4)
            </h3>
            <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Select 2 to 4 runs from the list below to begin benchmarking.</p>
          </div>
          {selectedRunIds.length >= 2 && (
            <div className="flex gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-zinc-750 hover:border-zinc-650 hover:bg-zinc-750 text-xs font-mono font-medium rounded text-zinc-200 transition-all cursor-pointer"
                title="Copy Markdown Report to clipboard"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 animate-scale-up" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadJSON}
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-zinc-750 hover:border-zinc-650 hover:bg-zinc-750 text-xs font-mono font-medium rounded text-zinc-200 transition-all cursor-pointer"
                title="Download full comparative report as a JSON file"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>JSON Download</span>
              </button>
            </div>
          )}
        </div>

        {completedRuns.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No completed runs yet"
              description="You must run at least two evaluation runs (simulated or real) in this suite before you can perform a side-by-side model comparison."
              action={
                <button
                  onClick={() => onNavigate(`/suites/${suite.id}`)}
                  className="px-4 py-2 bg-[#bef264] text-black text-xs font-semibold font-mono rounded cursor-pointer hover:brightness-110"
                >
                  Start First Evaluation
                </button>
              }
            />
          </div>
        ) : completedRuns.length < 2 ? (
          <div className="p-8 text-center text-zinc-500 space-y-3 font-sans text-xs">
            <Info className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="font-bold text-zinc-300">Run at least two completed evals for this suite to compare providers.</p>
            <p className="text-zinc-500 max-w-sm mx-auto">Currently you only have {completedRuns.length} completed run. Head back to the suite page and execute another run.</p>
            <button
              onClick={() => onNavigate(`/suites/${suite.id}`)}
              className="mt-2 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 font-mono rounded cursor-pointer"
            >
              Go Run Evaluation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-black/30 text-zinc-400 border-b border-white/5 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-6 w-12 text-center">Compare</th>
                  <th className="py-3 px-4">Model & Provider</th>
                  <th className="py-3 px-4">Version / Mode</th>
                  <th className="py-3 px-4 text-center">Avg Score</th>
                  <th className="py-3 px-4 text-center">Pass / Partial / Fail</th>
                  <th className="py-3 px-4 text-center">Latency</th>
                  <th className="py-3 px-6 text-right">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {completedRuns.map(rn => {
                  const isSelected = selectedRunIds.includes(rn.id);
                  const isCheckboxDisabled = !isSelected && selectedRunIds.length >= 4;
                  return (
                    <tr 
                      key={rn.id} 
                      onClick={() => !isCheckboxDisabled && handleToggleRun(rn.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-[#bef264]/5 hover:bg-[#bef264]/10 border-l-2 border-[#bef264]' 
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-3 px-6 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isCheckboxDisabled}
                          onChange={() => handleToggleRun(rn.id)}
                          className="h-3.5 w-3.5 accent-[#bef264] rounded border-zinc-750 text-black cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{rn.modelName}</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                          Provider: {rn.provider || 'simulated'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-zinc-300 text-[10px] rounded mr-2 font-semibold">
                          {rn.systemVersion}
                        </span>
                        {rn.runMode === 'real' ? (
                          <span className="px-1.5 py-0.5 bg-[#bef264]/10 border border-[#bef264]/30 text-[#bef264] text-[9px] rounded font-bold uppercase">
                            Real
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] rounded font-semibold uppercase">
                            Simulated
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm font-bold ${
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
                        <div className="flex items-center justify-center gap-1 font-semibold">
                          <span className="text-emerald-400">{rn.passCount}</span>
                          <span className="text-zinc-600">/</span>
                          <span className="text-amber-400">{rn.partialCount}</span>
                          <span className="text-zinc-600">/</span>
                          <span className="text-rose-400">{rn.failCount}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-zinc-300">
                        {rn.averageLatencyMs ? `${rn.averageLatencyMs}ms` : '---'}
                      </td>
                      <td className="py-3 px-6 text-right text-zinc-500">
                        {new Date(rn.startedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fallback state when fewer than 2 runs selected */}
      {selectedRunIds.length < 2 ? (
        <div className="border border-[#2d2d3c] border-dashed rounded-lg bg-[#14141d]/40 p-12 text-center font-sans space-y-3">
          <BarChart2 className="w-12 h-12 text-zinc-600 mx-auto animate-pulse" />
          <h3 className="text-sm font-bold text-zinc-300">Awaiting Run Selection</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Please check checkboxes on at least 2 runs above to render side-by-side dashboards, winner panel, disagreement alerts, and detailed assertion tables.
          </p>
        </div>
      ) : (
        <>
          {/* Main comparative workspace */}
          {isFetchingResults ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-6 h-6 text-[#bef264] animate-spin" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Syncing Case Level Results...</span>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* 2. Winner/Diagnosis Panel & Disagreement alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Winner Panel */}
                <div className="lg:col-span-1 border border-white/5 bg-zinc-900/50 backdrop-blur-sm rounded-lg p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                      <Sparkles className="w-4 h-4 text-[#bef264]" />
                      <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Winner & Diagnostics</h3>
                    </div>
                    
                    <div className="space-y-4 font-sans text-xs">
                      {diagnosis.bestScoringRun && (
                        <div className="flex items-start gap-3">
                          <Flame className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-zinc-500 uppercase text-[9px] font-mono tracking-wider font-bold block">Best Scoring</span>
                            <span className="font-bold text-white block text-sm">{diagnosis.bestScoringRun.modelName}</span>
                            <span className="text-zinc-400 font-mono">Avg Score: <strong className="text-emerald-400">{Math.round(diagnosis.bestScoringRun.averageScore)}%</strong></span>
                          </div>
                        </div>
                      )}

                      {diagnosis.fastestRun && (
                        <div className="flex items-start gap-3">
                          <Zap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-zinc-500 uppercase text-[9px] font-mono tracking-wider font-bold block">Fastest Response</span>
                            <span className="font-bold text-white block text-sm">{diagnosis.fastestRun.modelName}</span>
                            <span className="text-zinc-400 font-mono">Avg Latency: <strong className="text-cyan-400">{diagnosis.fastestRun.averageLatencyMs}ms</strong></span>
                          </div>
                        </div>
                      )}

                      {diagnosis.mostReliableRun && (
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-zinc-500 uppercase text-[9px] font-mono tracking-wider font-bold block">Most Reliable</span>
                            <span className="font-bold text-white block text-sm">{diagnosis.mostReliableRun.modelName}</span>
                            <span className="text-zinc-400">
                              Failures: <strong className="text-rose-400">{diagnosis.mostReliableRun.failCount}</strong>
                              {diagnosis.mostReliableRun.errorMessage && <span className="text-rose-500 text-[10px] block truncate">Error: {diagnosis.mostReliableRun.errorMessage}</span>}
                            </span>
                          </div>
                        </div>
                      )}

                      {diagnosis.mostConsistentRun && (
                        <div className="flex items-start gap-3">
                          <Activity className="w-5 h-5 text-[#bef264] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-zinc-500 uppercase text-[9px] font-mono tracking-wider font-bold block">Most Consistent</span>
                            <span className="font-bold text-white block text-sm">{diagnosis.mostConsistentRun.modelName}</span>
                            <span className="text-zinc-400">Steady scoring trend across cases.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-zinc-500 font-sans leading-relaxed">
                    *Diagnostics are generated based on static evaluations, run score averages, and fail counts.
                  </div>
                </div>

                {/* Disagreements List */}
                <div className="lg:col-span-2 border border-white/5 bg-zinc-900/50 backdrop-blur-sm rounded-lg p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Disagreement & Outlier Detection</h3>
                      </div>
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 font-mono text-[9px] rounded font-bold">
                        {disagreements.length} flagged
                      </span>
                    </div>

                    <div className="overflow-y-auto max-h-[220px] divide-y divide-white/5 pr-1 space-y-3">
                      {disagreements.length === 0 ? (
                        <div className="text-zinc-500 text-xs font-sans text-center py-10 space-y-1">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                          <p className="font-bold text-zinc-300">Models aligned!</p>
                          <p>No critical performance, evidence, or assertion disagreements found.</p>
                        </div>
                      ) : (
                        disagreements.map((d, index) => {
                          const severityStyle = 
                            d.severity === 'high' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : d.severity === 'medium'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20';

                          return (
                            <div key={index} className="py-2.5 space-y-1 text-xs font-sans first:pt-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">{d.caseName}</span>
                                <span className={`px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase rounded-sm ${severityStyle}`}>
                                  {d.severity} - {d.type.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-zinc-400 text-[11px] leading-relaxed">{d.explanation}</p>
                              <div className="text-[10px] text-zinc-600 font-mono">
                                Involved: {d.modelsInvolved.join(' vs ')}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-zinc-500 font-sans leading-relaxed">
                    Flag thresholds: Score gap &ge; 25%, Latency spread &ge; 2x (min 500ms diff), unmatched required evidence, or provider runtime errors.
                  </div>
                </div>
              </div>

              {/* 3. Aggregate Summary Cards Grid */}
              <div className={`grid gap-4 grid-cols-2 md:grid-cols-${selectedRunIds.length} w-full`}>
                {runSummaries.map((summary) => {
                  const tokenStr = typeof summary.totalTokens === 'number' 
                    ? summary.totalTokens.toLocaleString() 
                    : summary.totalTokens;
                  const costStr = typeof summary.estimatedCost === 'number'
                    ? `$${summary.estimatedCost.toFixed(5)}`
                    : summary.estimatedCost;

                  return (
                    <div 
                      key={summary.runId} 
                      className="p-4 rounded-lg border border-white/5 bg-zinc-900/50 backdrop-blur-sm space-y-3 text-xs font-mono"
                    >
                      <div className="border-b border-white/5 pb-2">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wide block">Provider: {summary.provider}</span>
                        <h4 className="font-bold text-white truncate text-sm" title={summary.modelName}>{summary.modelName}</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] leading-relaxed">
                        <div>
                          <span className="text-zinc-500 block uppercase text-[8px]">Score</span>
                          <span className="font-bold text-emerald-400 text-sm">{Math.round(summary.averageScore)}%</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase text-[8px]">Latency</span>
                          <span className="font-bold text-zinc-200 text-sm">{summary.averageLatencyMs}ms</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-white/5 text-[10px] text-zinc-400 leading-tight">
                        <div className="flex justify-between">
                          <span className="text-zinc-500 uppercase text-[8px]">Pass/Part/Fail</span>
                          <span className="font-bold text-zinc-300">
                            {summary.passCount}/{summary.partialCount}/{summary.failCount}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500 uppercase text-[8px]">Tokens</span>
                          <span className="text-zinc-300 font-mono">{tokenStr}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500 uppercase text-[8px]">Est. Cost</span>
                          <span className="text-zinc-300 font-mono">{costStr}</span>
                        </div>
                      </div>

                      {summary.errorMessage && (
                        <div className="mt-2 p-1.5 bg-rose-950/20 border border-rose-900/20 text-rose-400 rounded text-[9px] leading-normal line-clamp-2" title={summary.errorMessage}>
                          Error: {summary.errorMessage}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 4. Case-by-Case Comparison Table */}
              <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
                  <h3 className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
                    Case-by-Case Evaluation Matrix ({cases.length} cases)
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-sans">
                    Showing benchmark breakdown across all selected models.
                  </span>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs font-mono table-fixed">
                    <thead>
                      <tr className="bg-black/30 text-zinc-400 border-b border-white/5 uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 w-48 shrink-0 bg-[#161622]">Eval Case Details</th>
                        {activeSelectedRuns.map((r) => (
                          <th key={r.id} className="py-3 px-4 w-72 shrink-0 border-l border-white/5">
                            <span className="font-bold text-white block truncate">{r.modelName}</span>
                            <span className="text-[9px] text-zinc-500 block uppercase">
                              {r.provider} · {r.systemVersion}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {comparisonRows.map((row) => (
                        <tr key={row.caseId} className="hover:bg-white/2 transition-colors align-top">
                          {/* Case details header column */}
                          <td className="py-4 px-4 bg-[#11111a] space-y-1">
                            <span className="font-bold text-white font-sans block text-sm">{row.caseName}</span>
                            <div className="text-[9px] text-zinc-500 space-y-1 font-sans">
                              <span className="block line-clamp-2 hover:line-clamp-none transition-all">
                                <strong>Input:</strong> {row.input}
                              </span>
                              <span className="block line-clamp-2 hover:line-clamp-none transition-all">
                                <strong>Expected:</strong> {row.expectedOutput}
                              </span>
                              {row.requiredEvidence && (
                                <span className="block text-zinc-400">
                                  📂 *Evidence:* {row.requiredEvidence}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Model columns results */}
                          {activeSelectedRuns.map((r) => {
                            const res = row.resultsByRun[r.id];
                            const expandKey = `${row.caseId}-${r.id}`;
                            const isExpanded = !!expandedCells[expandKey];

                            if (!res) {
                              return (
                                <td key={r.id} className="py-4 px-4 border-l border-white/5 text-zinc-600 bg-zinc-950/20 italic">
                                  Not Run / Missing Result
                                </td>
                              );
                            }

                            return (
                              <td key={r.id} className="py-4 px-4 border-l border-white/5 space-y-3 font-sans">
                                
                                {/* Header score + latency row */}
                                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                                  <StatusBadge status={res.status} />
                                  <div className="text-right text-[10px] font-mono">
                                    <span className="font-bold text-white block">{res.score}% score</span>
                                    <span className="text-zinc-500 block">⏱️ {res.latencyMs !== undefined ? `${res.latencyMs}ms` : '---'}</span>
                                  </div>
                                </div>

                                {/* Evidence match indicator */}
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className={`w-1.5 h-1.5 rounded-full ${res.evidenceMatched ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                  <span className="text-zinc-400 font-mono text-[9px] uppercase">
                                    Evidence Citations: <strong className={res.evidenceMatched ? 'text-emerald-400' : 'text-rose-400'}>
                                      {res.evidenceMatched ? 'PASS' : 'FAIL'}
                                    </strong>
                                  </span>
                                  <span className="text-zinc-600 font-mono">|</span>
                                  <span className="text-zinc-400 font-mono text-[9px]">
                                    Asserts: {res.passedAssertionsCount}/{res.assertionsCount}
                                  </span>
                                </div>

                                {/* Actual Output snippet */}
                                <div className="space-y-1 bg-black/20 p-2.5 rounded border border-white/5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">Model Output</span>
                                    <button
                                      onClick={() => toggleExpandCell(row.caseId, r.id)}
                                      className="text-[9px] font-mono text-[#bef264] hover:underline cursor-pointer select-none"
                                    >
                                      {isExpanded ? 'Collapse' : 'Show Full'}
                                    </button>
                                  </div>
                                  
                                  {res.providerError ? (
                                    <p className="text-[10px] font-mono text-rose-400 leading-relaxed font-semibold">
                                      {res.providerError}
                                    </p>
                                  ) : (
                                    <p className={`text-[11px] font-mono text-zinc-300 leading-relaxed break-words whitespace-pre-wrap ${
                                      isExpanded ? '' : 'line-clamp-3'
                                    }`}>
                                      {res.actualOutput || '*Empty output*'}
                                    </p>
                                  )}
                                </div>

                                {/* Link to full run detail */}
                                <div className="flex justify-end pt-1">
                                  <a 
                                    href={`#/runs/${r.id}`}
                                    className="inline-flex items-center gap-1 text-[9px] font-mono text-zinc-500 hover:text-white transition-colors"
                                  >
                                    <span>Run Details</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>

                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}
