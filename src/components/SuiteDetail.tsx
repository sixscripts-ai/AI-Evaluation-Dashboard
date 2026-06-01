import React, { useEffect, useState } from 'react';
import { 
  SectionHeader, Breadcrumb, StatusBadge, EmptyState 
} from './UI.js';
import { 
  ArrowLeft, PlusCircle, Play, Layers, ShieldAlert, Cpu, Calendar, Loader2, Gauge, CheckCircle2, ChevronRight, Settings 
} from 'lucide-react';

interface SuiteDetailData {
  suite: {
    id: string;
    name: string;
    description: string;
    project: string;
    systemType: 'rag' | 'agent' | 'classification' | 'extraction' | 'summarization' | 'other';
    status: 'active' | 'archived';
    createdAt: string;
    updatedAt: string;
  };
  cases: {
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
  }[];
  runs: {
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
  }[];
}

interface SuiteDetailProps {
  suiteId: string;
  onNavigate: (route: string) => void;
}

export default function SuiteDetail({ suiteId, onNavigate }: SuiteDetailProps) {
  const [data, setData] = useState<SuiteDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Run Creator Dialog controllers
  const [showRunDrawer, setShowRunDrawer] = useState(false);
  const [runModel, setRunModel] = useState('gemini-2.5-flash');
  const [runVersion, setRunVersion] = useState('v1.2.0-rc2');
  const [runNotes, setRunNotes] = useState('Manual telemetry verification run.');
  const [runProfile, setRunProfile] = useState<'optimized' | 'average' | 'stale'>('average');
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerReport, setTriggerReport] = useState<{ runId: string; score: number; regressions: number } | null>(null);

  const fetchSuiteDetails = () => {
    setIsLoading(true);
    fetch(`/api/suites/${suiteId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve suite metadata.');
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
  };

  useEffect(() => {
    fetchSuiteDetails();
  }, [suiteId]);

  const handleTriggerRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTriggering(true);
    setTriggerReport(null);

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suiteId,
          modelName: runModel,
          systemVersion: runVersion,
          notes: runNotes,
          profile: runProfile
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to dispatch evaluation run.');
      }

      const runReport = await res.json();
      setTriggerReport({
        runId: runReport.runId,
        score: runReport.averageScore,
        regressions: runReport.regressionCount
      });
      setIsTriggering(false);
      // Let details refresh in background
      fetch(`/api/suites/${suiteId}`)
        .then(r => r.json())
        .then(resData => setData(resData));
    } catch (err: any) {
      alert(`Simulation trigger abort: ${err.message}`);
      setIsTriggering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#bef264] animate-spin" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Opening Secure Portal Sandbox...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12">
        <div className="bg-rose-950/20 text-rose-400 border border-rose-800/35 p-6 rounded-md font-mono text-xs max-w-lg">
          <ShieldAlert className="w-6 h-6 text-rose-500 mb-2" />
          <h3 className="font-bold uppercase tracking-wider mb-2">Access Exception</h3>
          <p>{error || 'Suite resource details unreachable.'}</p>
          <button 
            onClick={() => onNavigate('/suites')}
            className="mt-4 px-4 py-1.5 bg-zinc-900 border border-zinc-700 text-white font-mono rounded cursor-pointer"
          >
            ← Back to Suites Index
          </button>
        </div>
      </div>
    );
  }

  const { suite, cases, runs } = data;

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumb 
        items={[
          { name: 'Dashboard', onClick: () => onNavigate('/') },
          { name: 'Suites List', onClick: () => onNavigate('/suites') },
          { name: suite.name }
        ]} 
      />

      {/* Corporate Metadata Panel */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 lg:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 bg-[#bef264]/10 text-[#bef264] border border-[#bef264]/20 rounded text-[10px] font-mono uppercase tracking-wider font-semibold">
                {suite.systemType}
              </span>
              <span className="text-xs font-mono text-zinc-500">
                PROJ-ID: <span className="text-zinc-300">{suite.project}</span>
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white font-sans">{suite.name}</h1>
          </div>

          <div className="flex shrink-0 gap-3">
            <button
              onClick={() => onNavigate(`/suites/${suite.id}/cases/new`)}
              className="px-4 py-1.5 border border-zinc-700 hover:border-zinc-500 text-xs font-mono rounded-sm transition-colors cursor-pointer"
            >
              + Create Case
            </button>
            <button
              onClick={() => {
                setTriggerReport(null);
                setShowRunDrawer(true);
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#bef264] text-black font-semibold text-xs font-mono hover:brightness-110 rounded-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(190,242,100,0.1)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Suite Evaluation
            </button>
          </div>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed max-w-4xl font-sans">
          {suite.description}
        </p>

        <div className="pt-4 border-t border-white/5 flex flex-wrap gap-x-8 gap-y-2 text-xs font-mono text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-zinc-600" />
            Class ID: <span className="text-zinc-300">{suite.id}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-zinc-600" />
            Enrolled: <span className="text-zinc-300">{new Date(suite.createdAt).toLocaleDateString()}</span>
          </span>
        </div>
      </div>

      {/* Run Drawer Modal simulator */}
      {showRunDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#0f0f14] border border-[#2d2d3c] rounded-lg max-w-md w-full overflow-hidden shadow-2xl animate-scale-up font-mono text-xs">
            <div className="px-5 py-4 bg-[#14141d] border-b border-[#252530] flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider">Execute Suite Run driver</span>
              <button 
                onClick={() => setShowRunDrawer(false)}
                className="text-zinc-500 hover:text-white cursor-pointer select-none text-base font-sans"
              >
                ✕
              </button>
            </div>

            {!triggerReport ? (
              <form onSubmit={handleTriggerRun} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-bold">Backing Language Model</label>
                  <select 
                    value={runModel} 
                    onChange={e => setRunModel(e.target.value)}
                    className="w-full shrink-0"
                    disabled={isTriggering}
                  >
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                    <option value="gpt-4o">gpt-4o (OpenAI Proxy)</option>
                    <option value="claude-3.5-sonnet">claude-3.5-sonnet (Anthropic)</option>
                    <option value="llama-3.3-70b">llama-3.3-70b (Local Engine)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-bold">Software Deployment Version</label>
                  <input 
                    type="text" 
                    value={runVersion} 
                    onChange={e => setRunVersion(e.target.value)}
                    required
                    placeholder="e.g. v1.2-rc4"
                    className="w-full"
                    disabled={isTriggering}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-bold">Simulator Engine profile</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { key: 'optimized', title: 'Optimized', desc: 'SLA standard. high-score passes.' },
                      { key: 'average', title: 'Average Mix', desc: 'Standard release criteria passes/fails.' },
                      { key: 'stale', title: 'Stale Fallback', desc: 'Trigger high latency regressions.' }
                    ].map(prof => (
                      <button
                        key={prof.key}
                        type="button"
                        onClick={() => setRunProfile(prof.key as any)}
                        disabled={isTriggering}
                        className={`p-2 border rounded-sm text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${
                          runProfile === prof.key 
                            ? 'bg-[#bef264]/10 border-[#bef264] text-[#bef264]' 
                            : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="font-bold text-[11px] block">{prof.title}</span>
                        <span className="text-[8px] opacity-75 leading-tight">{prof.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-bold">Deployment annotations</label>
                  <textarea 
                    value={runNotes} 
                    onChange={e => setRunNotes(e.target.value)}
                    rows={2}
                    className="w-full font-sans"
                    disabled={isTriggering}
                  />
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRunDrawer(false)}
                    className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 text-zinc-400 transition-colors uppercase cursor-pointer"
                    disabled={isTriggering}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#bef264] text-black font-bold uppercase transition-colors rounded-sm flex items-center gap-1.5 cursor-pointer hover:brightness-110"
                    disabled={isTriggering}
                  >
                    {isTriggering ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> DISPATCHING RUN...
                      </>
                    ) : (
                      <>
                        <Play className="w-3" /> EXECUTE RUN
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              // Run Complete Feedback Report card
              <div className="p-5 space-y-5">
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/35 text-emerald-400 rounded flex gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <div>
                    <h4 className="font-bold block uppercase tracking-wide">Evaluation Sweep Complete</h4>
                    <p className="mt-1 text-zinc-300 font-sans">
                      All criteria assertions computed. Report serialized successfully.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border border-white/5 rounded bg-black/30 p-3 text-center">
                  <div className="border-r border-white/5 py-1">
                    <span className="text-[9px] text-[#bef264] uppercase block">AVERAGE SCORE</span>
                    <span className="text-xl font-bold font-mono tracking-tight text-white">{triggerReport.score}%</span>
                  </div>
                  <div className="py-1">
                    <span className="text-[9px] text-rose-400 uppercase block">REGRESSIONS TREND</span>
                    <span className="text-xl font-bold font-mono tracking-tight text-white">
                      {triggerReport.regressions > 0 ? `⚠️ ${triggerReport.regressions} issues` : '0 (STABLE)'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-xs font-mono pt-2">
                  <button
                    onClick={() => setShowRunDrawer(false)}
                    className="px-4 py-1.5 border border-zinc-800 hover:border-zinc-700 text-zinc-400 cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      setShowRunDrawer(false);
                      onNavigate(`/runs/${triggerReport.runId}`);
                    }}
                    className="px-4 py-1.5 bg-[#bef264] text-black font-semibold rounded-sm cursor-pointer hover:brightness-110"
                  >
                    Inspect Telemetry Report →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Split pane for Test Cases and Runs histories */}
      <div className="space-y-6">
        {/* Test Cases Checklist */}
        <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/20">
            <h3 className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
              Enrolled Assertion Test Cases ({cases.length})
            </h3>
            <button
              onClick={() => onNavigate(`/suites/${suite.id}/cases/new`)}
              className="text-[#bef264] font-mono text-xs hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              + Enroll New Case
            </button>
          </div>

          {cases.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                title="No test cases enrolled" 
                description="This suite does not have any active test cases yet. Register a test case prompt to drive system evaluation."
                action={
                  <button 
                    onClick={() => onNavigate(`/suites/${suite.id}/cases/new`)}
                    className="px-4 py-1.5 bg-zinc-900 border border-zinc-700 text-white text-xs font-mono cursor-pointer rounded"
                  >
                    Create First case
                  </button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-black/30 text-zinc-400 border-b border-white/5 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-6">Name & Description</th>
                    <th className="py-3 px-4">Evaluation standards</th>
                    <th className="py-3 px-4">Difficulty</th>
                    <th className="py-3 px-4">Tags</th>
                    <th className="py-3 px-4">Active</th>
                    <th className="py-3 px-6 text-right font-sans">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cases.map((cs) => (
                    <tr key={cs.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-6">
                        <button
                          onClick={() => onNavigate(`/cases/${cs.id}`)}
                          className="font-bold text-white hover:text-[#bef264] border-0 bg-transparent text-left hover:underline cursor-pointer font-sans"
                        >
                          {cs.name}
                        </button>
                        <span className="block text-[10px] text-zinc-500 mt-1 uppercase max-w-sm font-sans line-clamp-1">
                          EXPECTS: {cs.expectedOutput}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-zinc-400 font-sans block max-w-xs truncate leading-tight">
                          {cs.requiredEvidence}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-1.5 py-0.5 rounded-sm font-semibold uppercase text-[10px] ${
                          cs.difficulty === 'easy' 
                            ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/40' 
                            : cs.difficulty === 'medium' 
                              ? 'bg-amber-950/20 text-amber-500 border border-amber-900/40'
                              : 'bg-rose-950/20 text-rose-400 border border-rose-900/40'
                        }`}>
                          {cs.difficulty}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {cs.tags.map((tg, idx) => (
                            <span key={idx} className="text-[9px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 px-1 py-0.5 rounded">
                              #{tg}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block w-2 h-2 rounded-full ${cs.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => onNavigate(`/cases/${cs.id}`)}
                          className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-300 text-[10px] rounded"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Previous Runs History */}
        <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/20">
            <h3 className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
              Suite Evaluation Run History
            </h3>
          </div>

          {runs.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                title="No Runs recorded" 
                description="Execute an evaluation run to log software version comparative telemetry statistics."
                action={
                  <button 
                    onClick={() => {
                      setTriggerReport(null);
                      setShowRunDrawer(true);
                    }}
                    className="px-4 py-1.5 bg-zinc-900 border border-zinc-700 text-white text-xs font-mono cursor-pointer rounded"
                  >
                    Execute First Run
                  </button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-black/30 text-zinc-400 border-b border-white/5 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-6">Model ID</th>
                    <th className="py-3 px-4">Active Version</th>
                    <th className="py-3 px-4 text-center">Average Score</th>
                    <th className="py-3 px-4 text-center">Assertions Ratio</th>
                    <th className="py-3 px-4 text-center">Avg Latency</th>
                    <th className="py-3 px-4">Dateline Executed</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {runs.map((rn) => (
                    <tr key={rn.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-6">
                        <span className="font-bold text-white block">{rn.modelName}</span>
                        <span className="text-[10px] text-zinc-500 font-mono text-zinc-650">Run ID: {rn.id}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-zinc-300 text-[10px] font-bold rounded">
                          {rn.systemVersion}
                        </span>
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
                        <div className="flex items-center justify-center gap-1.5 font-bold">
                          <span className="text-emerald-500">{rn.passCount} ✓</span>
                          <span className="text-zinc-600">|</span>
                          <span className="text-amber-500">{rn.partialCount} △</span>
                          <span className="text-zinc-600">|</span>
                          <span className="text-rose-500">{rn.failCount} ✗</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-zinc-300">
                        {rn.averageLatencyMs ? `${rn.averageLatencyMs}ms` : '---'}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {new Date(rn.startedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => onNavigate(`/runs/${rn.id}`)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-500 border border-zinc-800 text-zinc-300 text-[10px] rounded transition-colors"
                        >
                          Report →
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
    </div>
  );
}
