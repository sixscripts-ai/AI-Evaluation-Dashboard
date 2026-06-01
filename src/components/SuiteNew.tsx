import React, { useState } from 'react';
import { SectionHeader, Breadcrumb } from './UI.js';
import { SuiteSchema, SuiteInput } from '../validators.js';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';

interface SuiteNewProps {
  onNavigate: (route: string) => void;
}

export default function SuiteNew({ onNavigate }: SuiteNewProps) {
  const [formData, setFormData] = useState<Partial<SuiteInput>>({
    name: '',
    description: '',
    project: '',
    systemType: 'rag',
    status: 'active'
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [ajaxError, setAjaxError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear validation error on change
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setAjaxError(null);

    // Validate using Zod client-side
    const result = SuiteSchema.safeParse(formData);
    if (!result.success) {
      const formatted = result.error.format();
      const errMap: Record<string, string> = {};
      
      // Flatten format
      Object.keys(formatted).forEach((key) => {
        if (key !== '_errors') {
          const fieldErrors = (formatted as any)[key]?._errors;
          if (fieldErrors && fieldErrors.length > 0) {
            errMap[key] = fieldErrors[0];
          }
        }
      });
      setValidationErrors(errMap);
      return;
    }

    // Submit to server
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ajax error submitting suite.');
      }

      const createdSuite = await res.json();
      setIsSubmitting(false);
      onNavigate(`/suites/${createdSuite.id}`);
    } catch (err: any) {
      setAjaxError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb 
        items={[
          { name: 'Dashboard', onClick: () => onNavigate('/') },
          { name: 'Suites List', onClick: () => onNavigate('/suites') },
          { name: 'Register Suite' }
        ]} 
      />

      <SectionHeader 
        title="Compose Evaluation Suite" 
        subtitle="Establish a new quality assurance cluster to organize comparative test prompts, variables, and history runs."
        action={
          <button
            onClick={() => onNavigate('/suites')}
            className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to list
          </button>
        }
      />

      {ajaxError && (
        <div className="bg-rose-950/20 border border-rose-800/35 p-5 text-rose-400 text-xs font-mono rounded flex gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <span className="font-bold uppercase tracking-wider block mb-1">Server Submission Error</span>
            {ajaxError}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-8 max-w-2xl space-y-6">
        {/* Name input */}
        <div className="space-y-1.5 flex flex-col">
          <label htmlFor="name-form" className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
            Suite Target Identifier <span className="text-[#bef264]">*</span>
          </label>
          <input
            type="text"
            id="name-form"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., GhostSSH Role Matching"
            className="w-full"
            disabled={isSubmitting}
          />
          <span className="text-[10px] text-zinc-500 font-mono">Keep it descriptive relative to the system/endpoint under test.</span>
          {validationErrors.name && (
            <p className="text-xs font-mono text-rose-400 mt-1 flex items-center gap-1.5">
              ⚠️ {validationErrors.name}
            </p>
          )}
        </div>

        {/* Project input */}
        <div className="space-y-1.5 flex flex-col">
          <label htmlFor="project-form" className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
            Project / Repository Code <span className="text-[#bef264]">*</span>
          </label>
          <input
            type="text"
            id="project-form"
            name="project"
            value={formData.project}
            onChange={handleChange}
            placeholder="e.g., SecOps Gateway v4"
            className="w-full"
            disabled={isSubmitting}
          />
          <span className="text-[10px] text-zinc-500 font-mono">Used for code tags tracing and repository synchronization.</span>
          {validationErrors.project && (
            <p className="text-xs font-mono text-rose-400 mt-1 flex items-center gap-1.5">
              ⚠️ {validationErrors.project}
            </p>
          )}
        </div>

        {/* System category Type selection */}
        <div className="space-y-1.5 flex flex-col">
          <label htmlFor="systemType-form" className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
            System Architecture Target <span className="text-[#bef264]">*</span>
          </label>
          <select
            id="systemType-form"
            name="systemType"
            value={formData.systemType}
            onChange={handleChange}
            className="w-full"
            disabled={isSubmitting}
          >
            <option value="rag">Retrieval-Grounded Search System (RAG)</option>
            <option value="agent">Autonomous Agent / Decision Workflow</option>
            <option value="classification">Text / Query Classifier</option>
            <option value="extraction">Structured Info JSON Extractor</option>
            <option value="summarization">Document Summarization Alignment</option>
            <option value="other">General Endpoint Assessment</option>
          </select>
          <span className="text-[10px] text-zinc-500 font-mono">Informs optimal evaluation metrics (e.g., citation matching for RAG, task execution for agents).</span>
          {validationErrors.systemType && (
            <p className="text-xs font-mono text-rose-400 mt-1 flex items-center gap-1.5">
              ⚠️ {validationErrors.systemType}
            </p>
          )}
        </div>

        {/* Description textarea */}
        <div className="space-y-1.5 flex flex-col">
          <label htmlFor="description-form" className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
            Suite Description <span className="text-[#bef264]">*</span>
          </label>
          <textarea
            id="description-form"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            placeholder="Introduce what queries are evaluated, safety assertions, and what system dependencies are audited."
            className="w-full resize-y font-sans leading-relaxed"
            disabled={isSubmitting}
          />
          <span className="text-[10px] text-zinc-500 font-mono">Detailed outline explaining target guidelines for other developers.</span>
          {validationErrors.description && (
            <p className="text-xs font-mono text-rose-400 mt-1 flex items-center gap-1.5">
              ⚠️ {validationErrors.description}
            </p>
          )}
        </div>

        {/* Action button bar */}
        <div className="pt-4 border-t border-white/5 flex justify-end gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={() => onNavigate('/suites')}
            className="px-4 py-2 border border-zinc-700 hover:border-zinc-500 rounded text-zinc-300 transition-colors cursor-pointer"
            disabled={isSubmitting}
          >
            Discard
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-[#bef264] text-black font-semibold rounded hover:brightness-110 transition-all cursor-pointer font-bold shadow-[0_0_15px_rgba(190,242,100,0.1)]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Completing...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Suite Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
