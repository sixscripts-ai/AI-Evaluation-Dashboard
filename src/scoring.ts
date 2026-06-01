import { 
  EvalSuite, EvalCase, EvidenceSource, EvalRun, 
  EvalResult, Regression, ServerState, AssertionResult,
  ResultStatus 
} from './types.js';
import { generateId } from './db.js';

// Simple helper to score case run results
export interface SimulatedCaseResult {
  actualOutput: string;
  status: ResultStatus;
  score: number;
  latencyMs: number;
  evidenceMatched: boolean;
  evidenceCoverageScore: number;
  assertions: AssertionResult[];
  failureReason?: string;
  notes?: string;
}

/**
 * Evaluates concrete assertions on actual outputs
 */
export function evaluateAssertions(
  actualOutput: string,
  expectedOutput: string,
  requiredEvidence: string,
  latencyMs: number,
  evidenceMatched: boolean
): AssertionResult[] {
  const assertions: AssertionResult[] = [];

  // Assertion 1: outputIncludes key terms from expected output
  const expectedKeywords = expectedOutput.split(/[\s,.\-"]+/).filter(w => w.length > 5).slice(0, 2);
  for (const word of expectedKeywords) {
    const hasWord = actualOutput.toLowerCase().includes(word.toLowerCase());
    assertions.push({
      id: generateId('as_eval'),
      type: 'outputIncludes',
      status: hasWord ? 'pass' : 'fail',
      expected: `Contains term "${word}"`,
      actual: hasWord ? `Found term "${word}" in output` : `Missing term "${word}"`,
      explanation: hasWord 
        ? `Output correctly includes the expected key phrase/word "${word}".`
        : `Output failed to include critical descriptive word "${word}".`
    });
  }

  // Assertion 2: evidenceIncludes if required evidence is supplied
  if (requiredEvidence) {
    const evidenceKeyTerms = requiredEvidence.split(/[\s,.\-"]+/).filter(w => w.length > 4).slice(0, 1);
    for (const term of evidenceKeyTerms) {
      const hasTerm = actualOutput.toLowerCase().includes(term.toLowerCase()) || evidenceMatched;
      assertions.push({
        id: generateId('as_eval'),
        type: 'evidenceIncludes',
        status: hasTerm ? 'pass' : 'fail',
        expected: `Cites information matching "${term}"`,
        actual: hasTerm ? `Grounding confirmed` : `No clear references to "${term}"`,
        explanation: hasTerm
          ? `Grounded: Output content successfully references or is supported by evidence: "${term}".`
          : `Hallucination Risk: Output does not refer to the required evidence source keywords.`
      });
    }
  }

  // Assertion 3: Latency bound SLA check
  const latencyPass = latencyMs < 1500;
  assertions.push({
    id: generateId('as_eval'),
    type: 'latencyLessThanMs',
    status: latencyPass ? 'pass' : 'fail',
    expected: 'Latency < 1500ms',
    actual: `${latencyMs}ms`,
    explanation: latencyPass
      ? `System speed falls within standard SLAs (< 1500ms).`
      : `Performance Regression: System took longer than the 1500ms SLA budget.`
  });

  return assertions;
}

/**
 * Build an EvalResult from a real or simulated case outcome.
 * Used by both the simulated run loop in app.ts and the real-provider
 * run loop. Computes status, score, evidence match, and the assertion
 * list from the actual output.
 */
export function buildCaseResult(
  args: {
    runId: string;
    caseId: string;
    actualOutput: string;
    latencyMs: number;
    requiredEvidenceMatched: boolean;
    evidenceCoverageScore: number;
    failureReason?: string;
    notes?: string;
    expectedOutput: string;
    requiredEvidence: string;
  }
): EvalResult {
  const assertions = evaluateAssertions(
    args.actualOutput,
    args.expectedOutput,
    args.requiredEvidence,
    args.latencyMs,
    args.requiredEvidenceMatched
  );

  const total = assertions.length;
  const passes = assertions.filter((a) => a.status === 'pass').length;
  const status: ResultStatus =
    total === 0
      ? 'fail'
      : passes === total
        ? 'pass'
        : passes === 0
          ? 'fail'
          : 'partial';
  const score = total === 0 ? 0 : Math.round((passes / total) * 100);

  return {
    id: generateId('res'),
    runId: args.runId,
    caseId: args.caseId,
    actualOutput: args.actualOutput,
    status,
    score,
    latencyMs: args.latencyMs,
    failureReason: args.failureReason,
    evidenceMatched: args.requiredEvidenceMatched,
    evidenceCoverageScore: args.evidenceCoverageScore,
    assertions,
    notes: args.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Heuristic check: does the actual output contain the required evidence
 * keyword(s)? This is a quick stand-in for a real semantic match. The
 * goal is to give real-provider runs a meaningful evidence column.
 */
export function checkEvidenceMatch(
  actualOutput: string,
  requiredEvidence: string
): { matched: boolean; coverageScore: number } {
  if (!requiredEvidence || requiredEvidence.trim().length === 0) {
    return { matched: false, coverageScore: 0 };
  }
  const outputLower = actualOutput.toLowerCase();
  const terms = requiredEvidence
    .split(/[\s,.\-"]+/)
    .filter((w) => w.length > 4)
    .slice(0, 3);
  if (terms.length === 0) {
    return { matched: false, coverageScore: 0 };
  }
  const hits = terms.filter((t) => outputLower.includes(t.toLowerCase()));
  const matched = hits.length > 0;
  const coverageScore = Math.round((hits.length / terms.length) * 100);
  return { matched, coverageScore };
}

/**
 * Generate a simulated evaluation run outcome for a checklist case
 */
export function simulateCase(
  testCase: EvalCase, 
  profile: 'optimized' | 'average' | 'stale'
): SimulatedCaseResult {
  let actualOutput = '';
  let status: ResultStatus = 'pass';
  let score = 100;
  let latencyMs = 600;
  let evidenceMatched = true;
  let evidenceCoverageScore = 95;
  let failureReason = undefined;

  const rand = Math.random();

  if (profile === 'optimized') {
    // 90% Pass, 10% Partial
    latencyMs = Math.floor(Math.random() * 500) + 400; // 400-900ms
    if (rand < 0.90) {
      actualOutput = `[Approved/Valid] System resolved query successfully. ${testCase.expectedOutput}`;
      status = 'pass';
      score = Math.floor(Math.random() * 11) + 90; // 90-100
      evidenceMatched = true;
      evidenceCoverageScore = Math.floor(Math.random() * 16) + 85; // 85-100
    } else {
      actualOutput = `Partially completed. Grounding matched. Relies on: ${testCase.requiredEvidence} with generic details.`;
      status = 'partial';
      score = Math.floor(Math.random() * 15) + 65; // 65-79
      evidenceMatched = true;
      evidenceCoverageScore = Math.floor(Math.random() * 20) + 60; // 60-80
    }
  } else if (profile === 'average') {
    // 70% Pass, 20% Partial, 10% Fail
    latencyMs = Math.floor(Math.random() * 800) + 800; // 800-1600ms
    if (rand < 0.70) {
      actualOutput = `[Corporate Portal Response] ${testCase.expectedOutput}. Verified against knowledge guidelines.`;
      status = 'pass';
      score = Math.floor(Math.random() * 16) + 85; // 85-100
      evidenceMatched = true;
      evidenceCoverageScore = Math.floor(Math.random() * 16) + 80;
    } else if (rand < 0.90) {
      actualOutput = `The RAG system returned intermediate data. Please cross reference the manual source document. Required: ${testCase.requiredEvidence.substring(0, 30)}...`;
      status = 'partial';
      score = Math.floor(Math.random() * 20) + 55; // 55-74
      evidenceMatched = true;
      evidenceCoverageScore = Math.floor(Math.random() * 25) + 50;
    } else {
      actualOutput = 'System Gateway Error: The query timeout limit has been exceeded, or output did not meet safety constraints.';
      status = 'fail';
      score = Math.floor(Math.random() * 25) + 15; // 15-39
      evidenceMatched = false;
      evidenceCoverageScore = 0;
      failureReason = 'Request timed out or model completed output with empty safety payload.';
    }
  } else {
    // 'stale' -> 20% Pass, 30% Partial, 50% Fail
    latencyMs = Math.floor(Math.random() * 1500) + 1500; // 1500-3000ms
    if (rand < 0.20) {
      actualOutput = `[Stale Branch Fallback] ${testCase.expectedOutput}`;
      status = 'pass';
      score = Math.floor(Math.random() * 11) + 80; // 80-90
      evidenceMatched = true;
      evidenceCoverageScore = Math.floor(Math.random() * 20) + 70;
    } else if (rand < 0.50) {
      actualOutput = `Synthesizing answers with stale index... Context found in workspace, but lacks specific details of ${testCase.requiredEvidence}`;
      status = 'partial';
      score = Math.floor(Math.random() * 15) + 50; // 50-64
      evidenceMatched = true;
      evidenceCoverageScore = Math.floor(Math.random() * 25) + 40;
    } else {
      actualOutput = 'Gateway error or completed with ungrounded responses. Model hallucinated invalid security credentials.';
      status = 'fail';
      score = Math.floor(Math.random() * 30) + 10; // 10-40
      evidenceMatched = false;
      evidenceCoverageScore = 5;
      failureReason = 'Severe grounding mismatch. Prompt failed to match required safety context records.';
    }
  }

  // Generate assertion records
  const assertions = evaluateAssertions(
    actualOutput, 
    testCase.expectedOutput, 
    testCase.requiredEvidence, 
    latencyMs, 
    evidenceMatched
  );

  return {
    actualOutput,
    status,
    score,
    latencyMs,
    evidenceMatched,
    evidenceCoverageScore,
    assertions,
    failureReason,
    notes: `Simulated via ${profile} engine run-driver.`
  };
}

/**
 * Computes regressions by comparing individual test case results between the 
 * current run and the previous completed run of the same suite.
 */
export function detectRegressions(
  currentResults: EvalResult[],
  previousResults: EvalResult[]
): Regression[] {
  const regressions: Regression[] = [];

  // Index previous results by caseId
  const prevMap = new Map<string, EvalResult>();
  for (const r of previousResults) {
    prevMap.set(r.caseId, r);
  }

  for (const current of currentResults) {
    const prev = prevMap.get(current.caseId);
    if (!prev) continue; // No base run for this case to compare against

    let regCode: 'score_drop' | 'status_downgrade' | 'latency_increase' | 'evidence_lost' | null = null;
    let description = '';
    let severity: 'low' | 'medium' | 'high' = 'low';

    // 1. Status downgrade
    const statusVal = (s: ResultStatus) => (s === 'pass' ? 3 : s === 'partial' ? 2 : 1);
    if (statusVal(current.status) < statusVal(prev.status)) {
      regCode = 'status_downgrade';
      severity = 'high';
      description = `State Downgrade: Status regressed from ${prev.status.toUpperCase()} to ${current.status.toUpperCase()} (Score dropped from ${prev.score} to ${current.score}).`;
    } 
    // 2. Score drop of 15+ points
    else if (prev.score - current.score >= 15) {
      regCode = 'score_drop';
      severity = 'high';
      description = `Core Score Decline: Evaluation metric score dropped by ${prev.score - current.score} points (From ${prev.score} down to ${current.score}).`;
    }
    // 3. Evidence lost
    else if (prev.evidenceMatched && !current.evidenceMatched) {
      regCode = 'evidence_lost';
      severity = 'high';
      description = `Grounding Regression: Output lost its citation grounding source link, failing critical evidence matching rules.`;
    }
    // 4. Latency spikes by 50%+ and goes over 1000ms
    else if (
      prev.latencyMs && 
      current.latencyMs && 
      current.latencyMs > 1000 && 
      current.latencyMs >= prev.latencyMs * 1.5
    ) {
      regCode = 'latency_increase';
      severity = 'medium';
      description = `Performance Alert: Response latency rose from ${prev.latencyMs}ms to ${current.latencyMs}ms (A ${Math.round((current.latencyMs / prev.latencyMs - 1) * 100)}% speed degradation).`;
    }

    if (regCode && description) {
      regressions.push({
        id: generateId('reg'),
        runId: current.runId,
        caseId: current.caseId,
        previousResultId: prev.id,
        regressionType: regCode,
        severity,
        description,
        createdAt: new Date().toISOString()
      });
    }
  }

  return regressions;
}
