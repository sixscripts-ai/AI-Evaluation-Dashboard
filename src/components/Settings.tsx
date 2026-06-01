import React, { useState } from 'react';
import { SectionHeader, Breadcrumb } from './UI.js';
import { RefreshCw, PlayCircle, Loader2, Database, ShieldAlert, Cpu } from 'lucide-react';

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
      if (!res.ok) throw new Error('Database refresh protocol aborted or timed out.');
      
      const report = await res.json();
      setSuccessMsg(report.message || 'Database state successfully recycled back to benchmark seed values!');
      setIsResetting(false);
      
      // Navigate to dashboard after 1.5 seconds so they see the success message
      setTimeout(() => {
        onNavigate('/');
      }, 1500);
    } catch (err: any) {
      alert(`Outage during reset: ${err.message}`);
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-mono text-xs">
      <Breadcrumb 
        items={[
          { name: 'Dashboard', onClick: () => onNavigate('/') },
          { name: 'Demo Controllers' }
        ]}
      />

      <SectionHeader 
        title="Admin controllers & Sandbox Settings" 
        subtitle="Manage file-based database records, restore evaluation benchmarks, or clear custom runs history." 
      />

      <div className="border border-[#bef264]/20 rounded-lg bg-[#bef264]/5 backdrop-blur-sm p-6 space-y-4 max-w-2xl">
        <h3 className="font-bold text-[#bef264] text-sm uppercase tracking-wide flex items-center gap-2">
          <Database className="w-4 h-4 text-[#bef264]" />
          Wipe Workspace State & Seed Database
        </h3>
        <p className="text-zinc-300 font-sans leading-relaxed text-sm">
          Resetting deletes all custom created Evaluation Suites, Test Cases, and Run histories, restoring the workspace back to its benchmark baseline records immediately:
        </p>

        <ul className="list-disc pl-5 font-sans text-xs text-zinc-400 space-y-1.5 leading-relaxed">
          <li><strong>3 baseline suites</strong>: GhostSSH, ICT Knowledge Engine, and Campus Compass.</li>
          <li><strong>4 active test cases</strong> per suite (12 core checklist questions).</li>
          <li><strong>1-2 evidence source documents</strong> attached to each checklist item.</li>
          <li><strong>2 full comparative runs</strong> per suite (including stable and regressed branches).</li>
          <li><strong>3 explicit regressions</strong> fully seeded inside database history reports.</li>
        </ul>

        {successMsg ? (
          <div className="p-4 bg-emerald-950/20 border border-emerald-800/35 text-emerald-400 rounded text-xs font-semibold uppercase tracking-wide animate-pulse">
            ✓ {successMsg} Redirecting to Command Console dashboard...
          </div>
        ) : (
          <div className="pt-2">
            <button
              onClick={handleResetDb}
              disabled={isResetting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#bef264] hover:brightness-110 text-black font-extrabold text-xs tracking-wider uppercase rounded-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(190,242,100,0.1)] disabled:opacity-50"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  RECYCLING SHARED LEDGERS...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Wipe & Populate Seed Data
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Workspace Architecture Overview */}
      <div className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-6 max-w-2xl space-y-4">
        <h3 className="text-xs uppercase font-bold text-zinc-400 font-mono tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-zinc-500" />
          Full-Stack Container Architecture
        </h3>
        <p className="text-zinc-400 font-sans leading-relaxed text-xs">
          EvalBench runs inside a sandboxed Linux container utilizing a full-stack dual server loop:
        </p>
        
        <table className="w-full text-left font-mono text-xs">
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-2 text-zinc-500 uppercase font-bold w-1/3">Backend Server</td>
              <td className="py-2 text-zinc-300">Express Node.js on Node Ports Ingress</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 text-zinc-500 uppercase font-bold">Persistence</td>
              <td className="py-2 text-zinc-300">Synchronized File DB Serializer (`/src/db-store.json`)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 text-zinc-500 uppercase font-bold">Client Assets</td>
              <td className="py-2 text-zinc-300">Compiled Vite 6 and React 19 Client Bundle</td>
            </tr>
            <tr>
              <td className="py-2 text-zinc-500 uppercase font-bold">Dynamic Scoring</td>
              <td className="py-2 text-zinc-300">Rule-based assertion check & latency budget tracking</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
