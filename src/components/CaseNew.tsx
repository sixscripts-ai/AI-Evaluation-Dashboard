import React, { useState, useEffect } from 'react';
import { SectionHeader, Breadcrumb } from './UI.js';
import { TestCaseSchema, TestCaseInput } from '../validators.js';
import { ArrowLeft, Save, Loader2, AlertCircle, HelpCircle } from 'lucide-react';

interface CaseNewProps {
  suiteId: string;
  onNavigate: (route: string) => void;
}

export default function CaseNew({ suiteId, onNavigate }: CaseNewProps) {
  const [suiteName, setSuiteName] = useState('...');
  const [formData, setFormData] = useState<Partial<TestCaseInput>>({
    name: '',
    input: '',
    expectedOutput: '',
    requiredEvidence: '',
    tagsInput: '',
    difficulty: 'medium',
    isActive: true,
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [ajaxError, setAjaxError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/suites/${suiteId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.suite) {
          setSuiteName(data.suite.name);
        }
      })
      .catch(() => {});
  }, [suiteId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: val }));
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
    const result = TestCaseSchema.safeParse(formData);
    if (!result.success) {
      const formatted = result.error.format();
      const errMap: Record<string, string> = {};
      
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
      const res = await fetch(`/api/suites/${suiteId}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to enroll case.');
      }

      setIsSubmitting(false);
      onNavigate(`/suites/${suiteId}`);
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
          { name: suiteName, onClick: () => onNavigate(`/suites/${suiteId}`) },
          { name: 'Enroll Test Case' }
        ]} 
      />

      <SectionHeader 
        title="Enroll Evaluation Case" 
        subtitle={`Registering a new quality checklist rule for comparison runs inside [${suiteName}].`}
        action={
          <button
            onClick={() => onNavigate(`/suites/${suiteId}`)}
            className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Suite details
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

      <form onSubmit={handleSubmit} className="border border-white/5 rounded-lg bg-zinc-900/50 backdrop-blur-sm p-8 max-w-3xl space-y-6">
        {/* Name Input */}
        <div className="space-y-1.5 flex flex-col">
          <label htmlFor="name-case" className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
            Assertion Title / Metric Case <span className="text-[#bef264]">*</span>
          </label>
          <input
            type="text"
            id="name-case"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Verify SSH access denied to expired public keys"
            className="w-full font-bold"
            disabled={isSubmitting}
          />
          <span className="text-[10px] text-zinc-500 font-mono">Simple action-oriented, distinct name for assertion results overview layouts.</span>
          {validationErrors.name && (
            <p className="text-xs font-mono text-rose-400 mt-1 flex items-center gap-1.5">
              ⚠️ {validationErrors.name}
            </p>
          )}
        </div>

        {/* Input prompt / task */}
        <div className="space-y-1.5 flex flex-col">
          <label htmlFor="input-case" className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
            User Prompt Input / Payload Variables <span className="text-[#bef264]">*</span>
          </label>
          <textarea
            id="input-case"
            name="input"
            rows={5}
            value={formData.input}
            onChange={handleChange}
            placeholder="Introduce the explicit terminal query parameters or variables. E.g.
Access Request:
User: sally_devops
Key: ssh-ed25519 AAAAC3...
Token_Validity: expired"
            className="w-full resize-y font-mono text-xs leading-relaxed"
            disabled={isSubmitting}
          />
          <span className="text-[10px] text-zinc-500 font-mono">Input data fed into the LLM or agent workflow for testing.</span>
          {validationErrors.input && (
            <p className="text-xs font-mono text-rose-400 mt-1 flex items-center gap-1.5">
              ⚠️ {validationErrors.input}
            </p>
          )}
        </div>

        {/* Expected output */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5 flex flex-col">
            <label htmlFor="expectedOutput-case" className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
              Expected Output <span className="text-[#bef264]">*</span>
            </label>
            <textarea
              id="expectedOutput-case"
              name="expectedOutput"
              rows={4}
              value={formData.expectedOutput}
              onChange={handleChange}
              placeholder="e.g., Access Denied. Reason: Token has expired. Please run kinit to refresh keys."
              className="w-full resize-y font-mono text-xs leading-relaxed"
              disabled={isSubmitting}
            />
            <span className="text-[10px] text-zinc-500 font-mono">Crucial keyword assertions must be specified explicitly (used by scoring checker).</span>
            {validationErrors.expectedOutput && (
              <p className="text-xs font-mono text-rose-400 mt-1 flex items-center gap-1.5">
                ⚠️ {validationErrors.expectedOutput}
              </p>
            )}
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label htmlFor="requiredEvidence-case" className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
              Required Grounding Evidence <span className="text-[#bef264]">*</span>
            </label>
            <textarea
              id="requiredEvidence-case"
              name="requiredEvidence"
              rows={4}
              value={formData.requiredEvidence}
              onChange={handleChange}
              placeholder="e.g., Session token expired error code ERR_AUTH_EXP must be logged in results."
              className="w-full resize-y font-mono text-xs leading-relaxed"
              disabled={isSubmitting}
            />
            <span className="text-[10px] text-zinc-500 font-mono">Facts, guidelines, or sections that MUST support the model outcome (discovers hallucinations).</span>
            {validationErrors.requiredEvidence && (
              <p className="text-xs font-mono text-rose-400 mt-1 flex items-center gap-1.5">
                ⚠️ {validationErrors.requiredEvidence}
              </p>
            )}
          </div>
        </div>

        {/* Difficulty and tags split row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5 flex flex-col">
            <label htmlFor="difficulty-case" className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              Test Difficulty Standard <span className="text-[#bef264]">*</span>
            </label>
            <select
              id="difficulty-case"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              className="w-full"
              disabled={isSubmitting}
            >
              <option value="easy">EASY (Linear path verify)</option>
              <option value="medium">MEDIUM (Complex rules logic boundary)</option>
              <option value="hard">HARD (Extreme edge case, security clearance)</option>
            </select>
            {validationErrors.difficulty && (
              <p className="text-xs font-mono text-rose-400 mt-1 flex items-center gap-1.5">
                ⚠️ {validationErrors.difficulty}
              </p>
            )}
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label htmlFor="tags-case" className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              Tags List <span className="text-zinc-500">(comma-separated)</span>
            </label>
            <input
              type="text"
              id="tags-case"
              name="tagsInput"
              value={formData.tagsInput}
              onChange={handleChange}
              placeholder="e.g., security, token, expiration"
              className="w-full"
              disabled={isSubmitting}
            />
            <span className="text-[10px] text-zinc-500 font-mono">Makes filters and indexing simple inside dashboard lookups.</span>
          </div>
        </div>

        {/* Notes input */}
        <div className="space-y-1.5 flex flex-col">
          <label htmlFor="notes-case" className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
            Developer Checklist Annotations <span className="text-zinc-500">(optional)</span>
          </label>
          <textarea
            id="notes-case"
            name="notes"
            rows={2}
            value={formData.notes || ''}
            onChange={handleChange}
            placeholder="e.g., Crucial boundary checklist requirement modeled on RFC SSO guidelines."
            className="w-full resize-y font-sans leading-relaxed"
            disabled={isSubmitting}
          />
        </div>

        {/* Checkbox active state */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <input
            type="checkbox"
            id="isActive-case"
            name="isActive"
            checked={formData.isActive !== false}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="w-4 h-4 rounded text-[#bef264] border-white/10 bg-black/35 focus:ring-[#bef264]"
            disabled={isSubmitting}
          />
          <label htmlFor="isActive-case" className="text-zinc-300 font-bold select-none cursor-pointer">
            TEST CASE ACTIVE (Include in automated comparative run-sweeps)
          </label>
        </div>

        {/* Actions Button Panel */}
        <div className="pt-4 border-t border-white/5 flex justify-end gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={() => onNavigate(`/suites/${suiteId}`)}
            className="px-4 py-2 border border-zinc-700 hover:border-zinc-500 rounded text-zinc-300 transition-colors cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-[#bef264] text-black font-bold rounded hover:brightness-110 transition-all cursor-pointer shadow-[0_0_15px_rgba(190,242,100,0.1)]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Enrolling...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Enroll Test Case
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
