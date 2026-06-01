import React, { useState } from 'react';
import { SectionHeader, Breadcrumb } from './UI.js';
import { RefreshCw, Loader2, Database, ShieldAlert, Cpu } from 'lucide-react';

interface SettingsProps {
  onNavigate: (route: string) => void;
}

export default function Settings({ onNavigate }: SettingsProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleResetDb = async () => {
    setIsResetting(true);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/settings/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');

      const report = await res.json();
      setSuccessMsg(report.message || 'Database reset to seed data.');
      setIsResetting(false);

      setTimeout(() => {
        onNavigate('/');
      }, 1500);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-mono text-xs">
      <Breadcrumb
        items={[
          { name: 'Dashboard', onClick: () => onNavigate('/') },
          { name: 'Settings' }
        ]}
      />

      <SectionHeader
        title="Settings"
        subtitle="Reset the database to seed data or inspect the deployment architecture."
      />

      <div className="border border-[#bef264]/20 rounded-lg bg-[#bef264]/5 backdrop-blur-sm p-6 space-y-4 max-w-2xl">
        <h3 className="font-bold text-[#bef264] text-sm uppercase tracking-wide flex items-center gap-2">
          <Database className="w-4 h-4 text-[#bef264]" />
          Reset to Seed Data
        </h3>
        <p className="text-zinc-300 font-sans leading-relaxed text-sm">
          Resetting deletes all custom suites, test cases, runs, and regressions, restoring the workspace to its baseline:
        </p>

        <ul className="list-disc pl-5 font-sans text-xs text-zinc-400 space-y-1.5 leading-relaxed">
          <li><strong>3 baseline suites</strong> with a mix of RAG and agent test cohorts.</li>
          <li><strong>4 active test cases</strong> per suite (12 in total).</li>
          <li><strong>1-2 evidence source documents</strong> per test case.</li>
          <li><strong>2 historical runs</strong> per suite (one stable, one regressed).</li>
          <li><strong>3 regressions</strong> pre-seeded for the demo.</li>
        </ul>

        {successMsg ? (
          <div className="p-4 bg-emerald-950/20 border border-emerald-800/35 text-emerald-400 rounded text-xs font-semibold uppercase tracking-wide">
            {successMsg} Redirecting to dashboard...
          </div>
        ) : (
          <div className="pt-2">
            <button
              onClick={handleResetDb}
              disabled={isResetting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#bef264] hover:brightness-110 text-black font-bold text-xs rounded-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Reset to Seed Data
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Architecture overview */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 max-w-2xl space-y-4">
        <h3 className="text-xs uppercase font-bold text-zinc-400 font-mono tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-zinc-500" />
          Architecture
        </h3>
        <p className="text-zinc-400 font-sans leading-relaxed text-xs">
          EvalBench is a single-tenant full-stack application deployed as a Vercel serverless function with a static React client.
        </p>

        <table className="w-full text-left font-mono text-xs">
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-2 text-zinc-500 uppercase font-bold w-1/3">Backend</td>
              <td className="py-2 text-zinc-300">Express on Node.js 24 (Vercel serverless)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 text-zinc-500 uppercase font-bold">Persistence</td>
              <td className="py-2 text-zinc-300">Neon Postgres (via Prisma)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 text-zinc-500 uppercase font-bold">Client</td>
              <td className="py-2 text-zinc-300">React 19 + Vite 6 + Tailwind CSS</td>
            </tr>
            <tr>
              <td className="py-2 text-zinc-500 uppercase font-bold">Scoring</td>
              <td className="py-2 text-zinc-300">Rule-based assertion engine with simulated scoring profiles</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
