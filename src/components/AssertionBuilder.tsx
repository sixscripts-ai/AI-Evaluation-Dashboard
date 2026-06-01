import React, { useState } from 'react';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';
import { AssertionRule, AssertionType } from '../types.js';

interface AssertionBuilderProps {
  assertions: AssertionRule[];
  onChange: (assertions: AssertionRule[]) => void;
}

const ASSERTION_TYPES: { value: AssertionType; label: string; placeholder: string }[] = [
  { value: 'outputIncludes', label: 'Output Includes (Text)', placeholder: 'e.g. Approved' },
  { value: 'outputExcludes', label: 'Output Excludes (Text)', placeholder: 'e.g. Error' },
  { value: 'exactMatch', label: 'Exact Match (Text)', placeholder: 'e.g. Yes' },
  { value: 'regexMatch', label: 'Regex Match (Text)', placeholder: 'e.g. ^[0-9]+$' },
  { value: 'evidenceIncludes', label: 'Evidence Includes (Grounding)', placeholder: 'e.g. Policy 42' },
  { value: 'evidenceMissing', label: 'Evidence Missing (Grounding)', placeholder: 'e.g. Secret Key' },
  { value: 'classificationEquals', label: 'Classification Equals', placeholder: 'e.g. positive' },
  { value: 'jsonFieldEquals', label: 'JSON Field Equals', placeholder: 'e.g. status=200' },
  { value: 'latencyLessThanMs', label: 'Latency < (ms)', placeholder: 'e.g. 1500' }
];

export function AssertionBuilder({ assertions, onChange }: AssertionBuilderProps) {
  const handleAdd = () => {
    const newRule: AssertionRule = {
      id: `asr_${Math.random().toString(36).substring(2, 9)}`,
      type: 'outputIncludes',
      expectedValue: '',
      weight: 1
    };
    onChange([...assertions, newRule]);
  };

  const handleUpdate = (id: string, field: keyof AssertionRule, value: string | number) => {
    onChange(
      assertions.map(a => 
        a.id === id ? { ...a, [field]: value } : a
      )
    );
  };

  const handleRemove = (id: string) => {
    onChange(assertions.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-4">
      {assertions.map((rule, index) => {
        const typeInfo = ASSERTION_TYPES.find(t => t.value === rule.type);
        
        return (
          <div key={rule.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex-none font-mono text-sm text-gray-500 w-6">
              #{index + 1}
            </div>
            
            <div className="flex-1 w-full sm:w-auto">
              <select
                value={rule.type}
                onChange={(e) => handleUpdate(rule.id, 'type', e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {ASSERTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 w-full sm:w-auto">
              <input
                type="text"
                value={rule.expectedValue}
                onChange={(e) => handleUpdate(rule.id, 'expectedValue', e.target.value)}
                placeholder={typeInfo?.placeholder || 'Expected value'}
                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <button
              onClick={() => handleRemove(rule.id)}
              className="p-2 text-gray-400 hover:text-red-500 focus:outline-none"
              title="Remove assertion"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      
      {assertions.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-3 text-sm text-yellow-800">
          <ShieldAlert className="w-5 h-5 text-yellow-500" />
          <p>This test case currently has no assertions. It will automatically fail during evaluations.</p>
        </div>
      )}
      
      <button
        onClick={handleAdd}
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add Assertion
      </button>
    </div>
  );
}
