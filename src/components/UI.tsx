import React from 'react';
import { 
  CheckCircle, AlertCircle, XCircle, TrendingDown, HelpCircle, FileText, ChevronRight 
} from 'lucide-react';
import { ResultStatus } from '../types.js';

// --- StatCard ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  subtext?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  highlight?: boolean;
}

export function StatCard({ title, value, icon, subtext, trend, highlight }: StatCardProps) {
  return (
    <div className={`p-5 rounded-lg border transition-all ${
      highlight 
        ? 'bg-[#bef264]/5 border-[#bef264]/20 shadow-[0_0_15px_rgba(190,242,100,0.05)]' 
        : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
    }`}>
      <div className="flex justify-between items-start">
        <span className="text-xs font-mono text-zinc-400 tracking-wider uppercase">{title}</span>
        {icon && <div className="text-zinc-500">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-bold font-mono tracking-tight ${highlight ? 'text-[#bef264]' : 'text-white'}`}>
          {value}
        </span>
        {trend && (
          <span className={`text-xs font-mono font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.value}
          </span>
        )}
      </div>
      {subtext && <p className="mt-1 text-xs text-zinc-500 font-mono">{subtext}</p>}
    </div>
  );
}

// --- StatusBadge ---
export function StatusBadge({ status }: { status: ResultStatus | string }) {
  const norm = status.toLowerCase();
  
  if (norm === 'pass') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        PASS
      </span>
    );
  }
  if (norm === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        PARTIAL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25">
      <XCircle className="w-3.5 h-3.5 shrink-0" />
      FAIL
    </span>
  );
}

// --- RegressionBadge ---
interface RegressionBadgeProps {
  type?: string;
  severity?: 'low' | 'medium' | 'high';
  indicatorOnly?: boolean;
}

export function RegressionBadge({ type, severity = 'medium', indicatorOnly = false }: RegressionBadgeProps) {
  const sevColors = {
    low: 'bg-[#1b1c24] text-zinc-300 border-zinc-700',
    medium: 'bg-amber-950/20 text-amber-500 border-amber-800/35',
    high: 'bg-rose-950/20 text-rose-400 border-rose-800/35 shadow-[0_0_10px_rgba(239,68,68,0.05)]'
  };

  if (indicatorOnly) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-mono leading-none border border-rose-500/40 text-rose-400 bg-rose-500/10 animate-pulse">
        <TrendingDown className="w-2.5 h-2.5" />
        REGRESSION
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-medium border ${sevColors[severity]}`}>
      <TrendingDown className="w-3.5 h-3.5" />
      <span>{type ? type.toUpperCase().replace('_', ' ') : 'REGRESSION DETECTED'}</span>
      <span className="text-[10px] opacity-75">({severity.toUpperCase()})</span>
    </span>
  );
}

// --- SectionHeader ---
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/10 mb-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </div>
  );
}

// --- EmptyState ---
interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-white/10 rounded-lg bg-zinc-900/10 backdrop-blur-sm">
      <HelpCircle className="w-12 h-12 text-zinc-600 mb-4 animate-pulse" />
      <h3 className="text-base font-semibold text-zinc-300 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-sm mb-6">{description}</p>
      {action && action}
    </div>
  );
}

// --- JsonBlock ---
export function JsonBlock({ data }: { data: any }) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return (
    <pre className="p-4 rounded-lg bg-black/40 border border-white/5 text-xs font-mono text-emerald-400 overflow-x-auto max-w-full">
      <code>{jsonStr}</code>
    </pre>
  );
}

// --- Breadcrumb list ---
export function Breadcrumb({ items }: { items: { name: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 mb-4">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-700 shrink-0" />}
          {item.onClick ? (
            <button 
              onClick={item.onClick}
              className="hover:text-white hover:underline cursor-pointer"
            >
              {item.name}
            </button>
          ) : (
            <span className="text-zinc-300 font-medium">{item.name}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
