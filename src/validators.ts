import { z } from 'zod';

export const SuiteSchema = z.object({
  name: z.string().min(3, { message: 'Suite name must be at least 3 characters long.' }),
  description: z.string().min(5, { message: 'Description must be at least 5 characters long.' }),
  project: z.string().min(2, { message: 'Project identifier name must be at least 2 characters long.' }),
  systemType: z.enum(['rag', 'agent', 'classification', 'extraction', 'summarization', 'other']),
  status: z.enum(['active', 'archived']).default('active'),
});

export type SuiteInput = z.infer<typeof SuiteSchema>;

export const TestCaseSchema = z.object({
  name: z.string().min(3, { message: 'Test case descriptor name must be at least 3 characters.' }),
  input: z.string().min(5, { message: 'Prompt input payload must be at least 5 characters long.' }),
  expectedOutput: z.string().min(5, { message: 'Expected target assertion output must be at least 5 characters.' }),
  requiredEvidence: z.string().min(5, { message: 'Required evidence grounding guidelines must be at least 5 characters.' }),
  tagsInput: z.string().optional(), // Comma-separated raw string from UI text input
  difficulty: z.enum(['easy', 'medium', 'hard']),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type TestCaseInput = z.infer<typeof TestCaseSchema>;

export const RunSchema = z.object({
  suiteId: z.string().min(1, { message: 'A targets suite selection is required.' }),
  modelName: z.string().min(2, { message: 'Identify the backing language model (e.g., gemini-2.5-flash).' }),
  systemVersion: z.string().min(2, { message: 'An active deployment tracking software version is required.' }),
  notes: z.string().optional(),
  profile: z.enum(['optimized', 'average', 'stale']).default('average'),
});

export type RunInput = z.infer<typeof RunSchema>;

/**
 * Real-or-simulated model run. Used by POST /api/suites/:id/run-model.
 */
export const RunModelSchema = z.object({
  provider: z.enum(['gemini', 'groq', 'openrouter']).optional(),
  model: z.string().min(2).optional(),
  systemVersion: z.string().min(2, { message: 'An active deployment tracking software version is required.' }),
  runMode: z.enum(['simulated', 'real']).default('simulated'),
  notes: z.string().optional(),
  profile: z.enum(['optimized', 'average', 'stale']).default('average'),
});

export type RunModelInput = z.infer<typeof RunModelSchema>;
