/**
 * Eval prompt builder.
 *
 * Constructs a deterministic, single-string prompt for a test case that
 * the model provider runners can send to a chat model. The prompt
 * includes:
 *
 * - The task / input
 * - The expected output as a rubric (so the model knows the target)
 * - The required evidence string
 * - Excerpts from any evidence sources attached to the case
 * - Explicit instructions not to fabricate sources and to answer directly
 *
 * The structure is intentionally compact and stable: the same test case
 * always produces the same prompt, so differences in model output can
 * be attributed to the model/version, not prompt drift.
 */

import { EvalCase, EvidenceSource } from '../types.js';

const SYSTEM_PROMPT = [
  'You are an evaluation target being tested for accuracy and grounding.',
  'Answer the user query directly and concisely.',
  'Do not invent document titles, citations, or sources that are not listed in the provided evidence.',
  'If the required evidence does not support an answer, say so plainly rather than guessing.',
  'Prefer short, specific answers over long, generic ones.',
].join(' ');

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

function formatEvidenceBlock(sources: EvidenceSource[]): string {
  if (sources.length === 0) return '';
  const lines: string[] = ['Evidence sources:'];
  sources.forEach((s, idx) => {
    const tag = `[${idx + 1}] ${s.title}`;
    const excerpt = truncate(s.excerpt || '', 500);
    const url = s.url ? ` (${s.url})` : '';
    lines.push(`${tag}${url}\n    "${excerpt}"`);
  });
  return lines.join('\n');
}

export interface BuildPromptArgs {
  testCase: Pick<EvalCase, 'input' | 'expectedOutput' | 'requiredEvidence' | 'name'>;
  evidenceSources?: EvidenceSource[];
}

export function buildEvalPrompt(args: BuildPromptArgs): { systemPrompt: string; input: string } {
  const { testCase, evidenceSources = [] } = args;
  const evidenceBlock = formatEvidenceBlock(evidenceSources);

  const sections: string[] = [];
  sections.push(`Task: ${testCase.name}`);
  sections.push('');
  sections.push('Input:');
  sections.push(testCase.input);
  sections.push('');

  if (testCase.expectedOutput) {
    sections.push('Target rubric (what a correct answer should cover):');
    sections.push(testCase.expectedOutput);
    sections.push('');
  }

  if (testCase.requiredEvidence) {
    sections.push('Required grounding:');
    sections.push(testCase.requiredEvidence);
    sections.push('');
  }

  if (evidenceBlock) {
    sections.push(evidenceBlock);
    sections.push('');
  }

  sections.push('Respond directly. Do not fabricate sources.');

  return {
    systemPrompt: SYSTEM_PROMPT,
    input: sections.join('\n'),
  };
}
