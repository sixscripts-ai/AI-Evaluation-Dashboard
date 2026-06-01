import React, { useEffect, useState } from 'react';
import { 
  SectionHeader, EmptyState 
} from './UI.js';
import { 
  Layers, ChevronRight, PlusCircle, AlertCircle, Loader2, Tag, PlayCircle 
} from 'lucide-react';

interface SuiteWithStats {
  id: string;
  name: string;
  description: string;
  project: string;
  systemType: 'rag' | 'agent' | 'classification' | 'extraction' | 'summarization' | 'other';
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  caseCount: number;
  runCount: number;
  lastRunScore?: number;
}

interface SuitesListProps {
  onNavigate: (route: string) => void;
}

export default function SuitesList({ onNavigate }: SuitesListProps) {
  const [suites, setSuites] = useState<SuiteWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/suites')
      .then(res => {
        if (!res.ok) throw new Error('Unresolved request: Unable to retrieve active suites.');
        return res.json();
      })
      .then(data => {
        setSuites(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  const systemTypeLabel = (type: string) => {
    switch (type) {
      case 'rag': return 'Retrieval Grounding (RAG)';
      case 'agent': return 'Agent Tool Orchestrator';
      case 'classification': return 'Classification Matcher';
      case 'extraction': return 'JSON Schema Extraction';
      case 'summarization': return 'Summarization Alignment';
      default: return type.toUpperCase();
    }
  };

  const filteredSuites = filterType === 'all' 
    ? suites 
    : suites.filter(s => s.systemType === filterType);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#bef264] animate-spin" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Scanning Evaluation Registry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader 
        title="Evaluation Suites" 
        subtitle="Silos designed to stress-test specific models, system variants, and RAG retrieval pipelines."
        action={
          <button
            onClick={() => onNavigate('/suites/new')}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#bef264] text-black font-semibold text-xs font-mono hover:brightness-110 rounded-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(190,242,100,0.1)]"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            Create Eval Suite
          </button>
        }
      />

      {/* Filter Options */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 uppercase text-[10px]">Filtering Class:</span>
          <div className="flex flex-wrap gap-1">
            {['all', 'rag', 'agent', 'classification', 'extraction', 'summarization'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-sm border cursor-pointer transition-colors ${
                  filterType === type 
                    ? 'bg-[#bef264]/10 border-[#bef264] text-[#bef264] font-semibold' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="text-zinc-500 text-[10px] uppercase">
          COUNT: <span className="text-white font-bold">{filteredSuites.length} suites listed</span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-800/35 p-5 text-rose-400 rounded flex gap-3 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <span className="font-bold uppercase tracking-wider block mb-1">Retrieval Error Encountered</span>
            {error}
          </div>
        </div>
      )}

      {filteredSuites.length === 0 ? (
        <EmptyState 
          title="No evaluation suites registered" 
          description={filterType !== 'all' 
            ? `There are no suites currently categorized under the "${filterType}" architectural design standard.`
            : "No testing assets found in the local configuration store. Create a suite to begin mapping assertions."}
          action={
            filterType !== 'all' ? (
              <button 
                onClick={() => setFilterType('all')}
                className="px-4 py-1.5 bg-zinc-900 border border-zinc-700 text-xs text-white font-mono rounded-sm cursor-pointer hover:border-zinc-500"
              >
                Reset Filter Status
              </button>
            ) : (
              <button 
                onClick={() => onNavigate('/suites/new')}
                className="px-4 py-1.5 bg-[#bef264] text-black font-semibold text-xs font-mono rounded-sm cursor-pointer hover:brightness-110"
              >
                Assemble Suite v1.0
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuites.map((suite) => (
            <div 
              key={suite.id}
              className="group border border-white/5 hover:border-white/20 rounded-lg bg-zinc-900/50 backdrop-blur-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-[0_4px_25px_rgba(0,0,0,0.3)]"
            >
              {/* Card Header styling */}
              <div className="p-5 border-b border-white/5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="px-2 py-0.5 bg-[#bef264]/10 text-[#bef264] border border-[#bef264]/20 rounded text-[10px] font-mono font-semibold uppercase tracking-wider">
                    {suite.systemType}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Pro: {suite.project}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#bef264] transition-colors leading-tight font-sans">
                    {suite.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 font-sans min-h-[2rem]">
                    {suite.description}
                  </p>
                </div>
              </div>

              {/* Card stats list */}
              <div className="p-5 bg-white/[0.02] flex-1 flex flex-col justify-between space-y-5">
                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div className="border-l-2 border-zinc-800 pl-3">
                    <span className="text-[10px] text-zinc-500 block leading-tight uppercase">Assessments</span>
                    <span className="text-lg font-bold text-zinc-200 mt-0.5 block">{suite.caseCount} Cases</span>
                  </div>
                  <div className="border-l-2 border-zinc-800 pl-3">
                    <span className="text-[10px] text-zinc-500 block leading-tight uppercase">Run Count</span>
                    <span className="text-lg font-bold text-zinc-200 mt-0.5 block">{suite.runCount} Runs</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div>
                    <span className="text-[9px] font-mono text-zinc-500 block leading-tight uppercase">LATEST SCORE</span>
                    {suite.lastRunScore !== undefined ? (
                      <span className={`text-sm font-mono font-bold leading-none mt-1 block ${
                        suite.lastRunScore >= 85 
                          ? 'text-emerald-400' 
                          : suite.lastRunScore >= 60 
                            ? 'text-amber-400' 
                            : 'text-rose-400'
                      }`}>
                        {Math.round(suite.lastRunScore)}% Avg Score
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-zinc-500 leading-none mt-1 block uppercase">pending run</span>
                    )}
                  </div>

                  <button
                    onClick={() => onNavigate(`/suites/${suite.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-500 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors uppercase cursor-pointer"
                  >
                    Manage Suite <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
