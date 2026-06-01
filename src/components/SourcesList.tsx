import React, { useEffect, useState } from 'react';
import { SectionHeader, EmptyState } from './UI.js';
import { Library, AlertCircle, Loader2, ExternalLink, ShieldAlert, Cpu } from 'lucide-react';

interface EvidenceSourceWithDetails {
  id: string;
  caseId: string;
  title: string;
  sourceType: 'document' | 'url' | 'note' | 'dataset' | 'code' | 'other';
  url?: string;
  excerpt: string;
  caseName: string;
  suiteName: string;
  createdAt: string;
}

interface SourcesListProps {
  onNavigate: (route: string) => void;
}

export default function SourcesList({ onNavigate }: SourcesListProps) {
  const [sources, setSources] = useState<EvidenceSourceWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/sources')
      .then(res => {
        if (!res.ok) throw new Error('Unresolved query: Failed to compile global evidence sources.');
        return res.json();
      })
      .then(data => {
        setSources(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  const filteredSources = sources.filter(s => {
    const textStr = `${s.title} ${s.excerpt} ${s.caseName} ${s.suiteName}`.toLowerCase();
    return textStr.includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 font-mono text-xs">
        <Loader2 className="w-8 h-8 text-[#bef264] animate-spin" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Loading sources...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-mono text-xs">
      <SectionHeader
        title="Evidence Sources"
        subtitle="Grounding documents attached to test cases. Each source provides context for assertion evaluation."
      />

      {error && (
        <div className="bg-rose-950/20 border border-rose-800/35 p-5 text-rose-400 rounded flex gap-3">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <span className="font-bold uppercase tracking-wider block mb-1">Failed to load sources</span>
            {error}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4 border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by title, excerpt, case, or suite..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="text-zinc-500 text-[10px] uppercase shrink-0 font-mono">
          {filteredSources.length} of {sources.length} sources
        </div>
      </div>

      {filteredSources.length === 0 ? (
        <EmptyState
          title="No sources found"
          description={searchTerm
            ? `No sources match "${searchTerm}".`
            : "No evidence sources registered. Add sources to test cases to populate this list."}
          action={
            searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-1.5 bg-zinc-900 border border-zinc-700 text-xs font-mono tracking-wider cursor-pointer rounded"
              >
                Clear Search
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
          {filteredSources.map((source) => (
            <div
              key={source.id}
              className="border border-white/5 hover:border-white/10 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-5 space-y-4 flex flex-col justify-between transition-all"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-white tracking-tight leading-tight text-sm">
                      {source.title}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono block mt-1">
                      ID: <span className="text-zinc-400">{source.id}</span>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-zinc-300 rounded font-mono text-[9px] uppercase tracking-wider">
                    {source.sourceType}
                  </span>
                </div>

                <div className="p-3.5 bg-black/40 rounded border border-white/5 font-mono text-zinc-400 text-xs leading-relaxed relative">
                  <span className="absolute -top-2 left-3 px-1.5 py-0.5 bg-zinc-950 text-zinc-400 text-[8px] font-bold border border-white/5 rounded">
                    Excerpt
                  </span>
                  <p className="mt-1 font-sans">
                    {source.excerpt}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[11px] font-mono">
                <div className="space-y-1">
                  <div>
                    <span className="text-zinc-500">Case: </span>
                    <button
                      onClick={() => onNavigate(`/cases/${source.caseId}`)}
                      className="font-bold text-zinc-300 hover:text-[#bef264] hover:underline text-left"
                    >
                      {source.caseName}
                    </button>
                  </div>
                  <div>
                    <span className="text-zinc-500">Suite: </span>
                    <span className="text-zinc-400">{source.suiteName}</span>
                  </div>
                </div>

                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="p-1 px-2 border border-zinc-800 hover:border-[#bef264] text-[#bef264] hover:bg-[#bef264]/5 transition-all rounded items-center gap-1 inline-flex text-[10px]"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" /> Open
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
