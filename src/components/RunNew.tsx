import React, { useEffect, useState } from 'react';
import { SectionHeader, Breadcrumb } from './UI.js';
import { Play, Loader2, Zap, Cpu, ShieldAlert, ChevronDown } from 'lucide-react';

interface SuiteOption {
  id: string;
  name: string;
  caseCount: number;
}

interface ProvidersInfo {
  providers: { id: string; name: string; available: boolean }[];
  defaultProvider: string;
  defaultModel: string;
}

interface RunNewProps {
  onNavigate: (route: string) => void;
}

export default function RunNew({ onNavigate }: RunNewProps) {
  const [suites, setSuites] = useState<SuiteOption[]>([]);
  const [providers, setProviders] = useState<ProvidersInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ runId: string; averageScore: number; regressionCount: number } | null>(null);

  // Form state
  const [suiteId, setSuiteId] = useState('');
  const [runMode, setRunMode] = useState<'simulated' | 'real'>('simulated');
  const [profile, setProfile] = useState<'optimized' | 'average' | 'stale'>('average');
  const [provider, setProvider] = useState('gemini');
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [systemVersion, setSystemVersion] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/suites').then(res => res.json()),
      fetch('/api/providers').then(res => res.json()),
    ])
      .then(([suitesData, providersData]) => {
        setSuites(suitesData);
        setProviders(providersData);
        setProvider(providersData.defaultProvider || 'gemini');
        setModelName(providersData.defaultModel || 'gemini-2.5-flash');
        if (suitesData.length > 0) setSuiteId(suitesData[0].id);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  const handleSubmit = async () => {
    if (!suiteId) { setError('Please select a suite.'); return; }
    if (!systemVersion.trim()) { setError('Please enter a system version.'); return; }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        runMode,
        systemVersion: systemVersion.trim(),
        notes: notes.trim() || undefined,
      };

      if (runMode === 'real') {
        body.provider = provider;
        body.model = modelName.trim() || undefined;
      } else {
        body.profile = profile;
        body.provider = 'gemini';
        body.model = 'gemini-2.5-flash';
      }

      const res = await fetch(`/api/suites/${suiteId}/run-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Run failed');
      }

      setResult({ runId: data.runId, averageScore: data.averageScore, regressionCount: data.regressionCount });
      setIsRunning(false);

      // Navigate to the run detail after a brief delay
      setTimeout(() => onNavigate(`/runs/${data.runId}`), 1500);
    } catch (err: any) {
      setError(err.message);
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#bef264] animate-spin" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Loading...</span>
      </div>
    );
  }

  const selectedSuite = suites.find(s => s.id === suiteId);
  const pendingRun = result && !isRunning;

  return (
    <div className="space-y-6 animate-fade-in font-mono text-xs">
      <Breadcrumb
        items={[
          { name: 'Dashboard', onClick: () => onNavigate('/') },
          { name: 'Runs', onClick: () => onNavigate('/runs') },
          { name: 'New Run' },
        ]}
      />

      <SectionHeader
        title="New Run"
        subtitle="Configure and trigger a new evaluation run against a suite."
      />

      {error && (
        <div className="bg-rose-950/20 border border-rose-800/35 p-5 text-rose-400 rounded flex gap-3 text-xs font-mono">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider block mb-1">Error</span>
            {error}
          </div>
        </div>
      )}

      {pendingRun && (
        <div className="bg-emerald-950/20 border border-emerald-800/35 p-5 text-emerald-400 rounded text-xs font-mono flex items-center gap-3">
          <Zap className="w-4 h-4 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider">Run completed!</span>
            <span className="ml-2">
              Score: {Math.round(result.averageScore)}% · {result.regressionCount} regression{result.regressionCount !== 1 ? 's' : ''}
            </span>
            <span className="ml-2 text-emerald-600">Redirecting to run detail...</span>
          </div>
        </div>
      )}

      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-8 max-w-3xl space-y-8">
        {/* Suite Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Target Suite <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <select
              value={suiteId}
              onChange={e => setSuiteId(e.target.value)}
              disabled={isRunning}
              className="w-full bg-zinc-950 border border-white/10 rounded px-4 py-2.5 text-sm text-white font-mono appearance-none cursor-pointer focus:outline-none focus:border-[#bef264] transition-colors disabled:opacity-50"
            >
              {suites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.caseCount} cases)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
          {selectedSuite && (
            <p className="text-[10px] text-zinc-500 mt-1">{selectedSuite.name} · {selectedSuite.caseCount} active test cases</p>
          )}
        </div>

        {/* Run Mode Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Run Mode</label>
          <div className="flex gap-3">
            <button
              onClick={() => setRunMode('simulated')}
              disabled={isRunning}
              className={`flex-1 flex items-center gap-3 px-5 py-3 rounded border text-left transition-all cursor-pointer disabled:opacity-50 ${
                runMode === 'simulated'
                  ? 'bg-[#bef264]/10 border-[#bef264]/40 text-[#bef264]'
                  : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/30'
              }`}
            >
              <Cpu className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold text-sm block">Simulated</span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Fast scoring using rule-based profiles</span>
              </div>
            </button>
            <button
              onClick={() => setRunMode('real')}
              disabled={isRunning}
              className={`flex-1 flex items-center gap-3 px-5 py-3 rounded border text-left transition-all cursor-pointer disabled:opacity-50 ${
                runMode === 'real'
                  ? 'bg-[#bef264]/10 border-[#bef264]/40 text-[#bef264]'
                  : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/30'
              }`}
            >
              <Zap className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold text-sm block">Real Provider</span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Run against Gemini / Groq / OpenRouter</span>
              </div>
            </button>
          </div>
        </div>

        {/* Simulated: Profile selector */}
        {runMode === 'simulated' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Simulation Profile</label>
            <div className="flex gap-2">
              {(['optimized', 'average', 'stale'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setProfile(p)}
                  disabled={isRunning}
                  className={`flex-1 px-4 py-2.5 rounded border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 ${
                    profile === p
                      ? 'bg-[#bef264]/10 border-[#bef264]/40 text-[#bef264]'
                      : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/30'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Real: Provider + Model */}
        {runMode === 'real' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Provider</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  disabled={isRunning}
                  className="w-full bg-zinc-950 border border-white/10 rounded px-4 py-2.5 text-sm text-white font-mono appearance-none cursor-pointer focus:outline-none focus:border-[#bef264] transition-colors disabled:opacity-50"
                >
                  {providers?.providers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.available ? '' : '(key not set)'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Model Name</label>
              <input
                type="text"
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                disabled={isRunning}
                placeholder="e.g. gemini-2.5-flash"
                className="w-full bg-zinc-950 border border-white/10 rounded px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#bef264] transition-colors placeholder:text-zinc-600 disabled:opacity-50"
              />
            </div>
          </>
        )}

        {/* System Version */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            System Version <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={systemVersion}
            onChange={e => setSystemVersion(e.target.value)}
            disabled={isRunning}
            placeholder="e.g. v1.2-rc4"
            className="w-full bg-zinc-950 border border-white/10 rounded px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#bef264] transition-colors placeholder:text-zinc-600 disabled:opacity-50"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={isRunning}
            placeholder="Optional context for this run..."
            rows={3}
            className="w-full bg-zinc-950 border border-white/10 rounded px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#bef264] transition-colors placeholder:text-zinc-600 resize-none disabled:opacity-50"
          />
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-white/5">
          <button
            onClick={handleSubmit}
            disabled={isRunning || !suiteId || !systemVersion.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-[#bef264] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider rounded transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-sans"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Start Run
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
