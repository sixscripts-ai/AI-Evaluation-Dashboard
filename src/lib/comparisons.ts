import { EvalRun, EvalResult, EvalCase } from '../types.js';

export interface RunSummary {
  runId: string;
  modelName: string;
  systemVersion: string;
  provider: string;
  runMode: string;
  averageScore: number;
  passCount: number;
  partialCount: number;
  failCount: number;
  averageLatencyMs: number;
  totalTokens: number | 'not reported';
  estimatedCost: number | 'not reported';
  errorMessage: string | null;
  createdAt: string;
}

export interface CaseComparisonRow {
  caseId: string;
  caseName: string;
  input: string;
  expectedOutput: string;
  requiredEvidence: string;
  resultsByRun: Record<string, {
    status: 'pass' | 'partial' | 'fail';
    score: number;
    latencyMs?: number;
    evidenceMatched: boolean;
    actualOutput: string;
    assertionsCount: number;
    passedAssertionsCount: number;
    providerError?: string;
    resultId: string;
  } | null>;
}

export interface Disagreement {
  caseId: string;
  caseName: string;
  type: 'status_disagreement' | 'score_gap' | 'evidence_mismatch' | 'latency_spread' | 'provider_error';
  explanation: string;
  severity: 'low' | 'medium' | 'high';
  modelsInvolved: string[];
}

export interface DiagnosisPanel {
  bestScoringRun: RunSummary | null;
  fastestRun: RunSummary | null;
  mostReliableRun: RunSummary | null;
  mostConsistentRun: RunSummary | null;
  mostFailuresRun: RunSummary | null;
  casesNeedingReviewCount: number;
}

// Basic cost estimator based on typical 2026 pricing guidelines for token count if available
function estimateCost(model: string, inputTokens?: number, outputTokens?: number): number | 'not reported' {
  if (inputTokens === undefined || outputTokens === undefined) return 'not reported';
  
  const m = model.toLowerCase();
  let inputRate = 0; // per million tokens
  let outputRate = 0; // per million tokens
  
  if (m.includes('gemini-2.5-flash')) {
    inputRate = 0.075;
    outputRate = 0.30;
  } else if (m.includes('gemini-2.5-pro')) {
    inputRate = 1.25;
    outputRate = 5.00;
  } else if (m.includes('llama-3.3-70b') || m.includes('groq')) {
    inputRate = 0.59;
    outputRate = 0.79;
  } else if (m.includes('gpt-4o')) {
    inputRate = 2.50;
    outputRate = 10.00;
  } else if (m.includes('claude-3.5-sonnet')) {
    inputRate = 3.00;
    outputRate = 15.00;
  } else {
    // Return "not reported" if we don't have price mappings, or default to some general rate if desired.
    // However, the rule says "show 'not reported', do not fake values" so it's safer to return "not reported".
    return 'not reported';
  }
  
  const cost = ((inputTokens / 1_000_000) * inputRate) + ((outputTokens / 1_000_000) * outputRate);
  return Math.round(cost * 100000) / 100000; // round to 5 decimal places
}

export function computeRunSummaries(runs: EvalRun[]): RunSummary[] {
  return runs.map(run => {
    const isSimulated = run.runMode === 'simulated' || run.provider === 'simulated';
    const totalTokens = run.totalTokens !== undefined ? run.totalTokens : 'not reported';
    
    // Estimate cost if tokens are reported
    let cost: number | 'not reported' = 'not reported';
    if (run.totalInputTokens !== undefined && run.totalOutputTokens !== undefined) {
      cost = estimateCost(run.modelName, run.totalInputTokens, run.totalOutputTokens);
    }
    
    return {
      runId: run.id,
      modelName: run.modelName,
      systemVersion: run.systemVersion,
      provider: run.provider || 'simulated',
      runMode: run.runMode || 'simulated',
      averageScore: run.averageScore !== undefined ? run.averageScore : 0,
      passCount: run.passCount || 0,
      partialCount: run.partialCount || 0,
      failCount: run.failCount || 0,
      averageLatencyMs: run.averageLatencyMs || 0,
      totalTokens,
      estimatedCost: cost,
      errorMessage: run.errorMessage || null,
      createdAt: run.createdAt
    };
  });
}

export function buildCaseComparisonRows(
  cases: EvalCase[],
  runResults: Record<string, EvalResult[]>,
  selectedRunIds: string[]
): CaseComparisonRow[] {
  return cases.map(c => {
    const resultsByRun: Record<string, any> = {};
    
    selectedRunIds.forEach(runId => {
      const results = runResults[runId] || [];
      const match = results.find(r => r.caseId === c.id);
      if (match) {
        resultsByRun[runId] = {
          status: match.status,
          score: match.score,
          latencyMs: match.latencyMs,
          evidenceMatched: match.evidenceMatched,
          actualOutput: match.actualOutput,
          assertionsCount: match.assertions?.length || 0,
          passedAssertionsCount: match.assertions?.filter(a => a.status === 'pass').length || 0,
          providerError: match.providerError,
          resultId: match.id
        };
      } else {
        resultsByRun[runId] = null;
      }
    });
    
    return {
      caseId: c.id,
      caseName: c.name,
      input: c.input,
      expectedOutput: c.expectedOutput,
      requiredEvidence: c.requiredEvidence,
      resultsByRun
    };
  });
}

export function detectDisagreements(
  cases: EvalCase[],
  runResults: Record<string, EvalResult[]>,
  selectedRuns: EvalRun[]
): Disagreement[] {
  const disagreements: Disagreement[] = [];
  const runSummaries = computeRunSummaries(selectedRuns);
  
  cases.forEach(c => {
    const validResults: { runSummary: RunSummary; result: EvalResult }[] = [];
    
    selectedRuns.forEach(run => {
      const results = runResults[run.id] || [];
      const res = results.find(r => r.caseId === c.id);
      const summary = runSummaries.find(s => s.runId === run.id);
      if (res && summary) {
        validResults.push({ runSummary: summary, result: res });
      }
    });
    
    if (validResults.length < 2) return;
    
    const statuses = validResults.map(vr => vr.result.status);
    const scores = validResults.map(vr => vr.result.score);
    const latencies = validResults.map(vr => vr.result.latencyMs || 0).filter(l => l > 0);
    const evidenceMatches = validResults.map(vr => vr.result.evidenceMatched);
    const providerErrors = validResults.map(vr => vr.result.providerError);
    
    const distinctStatuses = Array.from(new Set(statuses));
    const distinctEvidence = Array.from(new Set(evidenceMatches));
    
    // 1. Provider Error Disagreement
    const hasError = providerErrors.some(e => Boolean(e));
    const allErrors = providerErrors.every(e => Boolean(e));
    if (hasError && !allErrors) {
      const errRuns = validResults.filter(vr => Boolean(vr.result.providerError));
      const okRuns = validResults.filter(vr => !vr.result.providerError);
      disagreements.push({
        caseId: c.id,
        caseName: c.name,
        type: 'provider_error',
        explanation: `${errRuns.map(vr => vr.runSummary.modelName).join(', ')} failed with error: "${errRuns[0].result.providerError}", while others completed successfully.`,
        severity: 'high',
        modelsInvolved: validResults.map(vr => vr.runSummary.modelName)
      });
      return; // Skip other checks if provider failed completely on some runs
    }
    
    // 2. Status Disagreement
    if (distinctStatuses.length > 1) {
      const hasPass = distinctStatuses.includes('pass');
      const hasFail = distinctStatuses.includes('fail');
      const hasPartial = distinctStatuses.includes('partial');
      
      let severity: 'medium' | 'high' = 'medium';
      let explanation = '';
      
      if (hasPass && hasFail) {
        severity = 'high';
        const passModels = validResults.filter(vr => vr.result.status === 'pass').map(vr => vr.runSummary.modelName);
        const failModels = validResults.filter(vr => vr.result.status === 'fail').map(vr => vr.runSummary.modelName);
        explanation = `Complete disagreement: ${passModels.join(', ')} passed, while ${failModels.join(', ')} failed.`;
      } else if (hasPass && hasPartial) {
        severity = 'medium';
        const passModels = validResults.filter(vr => vr.result.status === 'pass').map(vr => vr.runSummary.modelName);
        const partModels = validResults.filter(vr => vr.result.status === 'partial').map(vr => vr.runSummary.modelName);
        explanation = `Partial disagreement: ${passModels.join(', ')} passed, while ${partModels.join(', ')} only partially satisfied assertions.`;
      } else if (hasPartial && hasFail) {
        severity = 'medium';
        const partModels = validResults.filter(vr => vr.result.status === 'partial').map(vr => vr.runSummary.modelName);
        const failModels = validResults.filter(vr => vr.result.status === 'fail').map(vr => vr.runSummary.modelName);
        explanation = `Minor disagreement: ${partModels.join(', ')} partially passed, while ${failModels.join(', ')} completely failed.`;
      }
      
      disagreements.push({
        caseId: c.id,
        caseName: c.name,
        type: 'status_disagreement',
        explanation,
        severity,
        modelsInvolved: validResults.map(vr => vr.runSummary.modelName)
      });
    }
    
    // 3. Score Gap
    if (scores.length >= 2) {
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const gap = maxScore - minScore;
      if (gap >= 25) {
        // If status disagreement didn't already capture it or if we want extra specificity
        const isAlreadyStatusFlagged = disagreements.some(d => d.caseId === c.id && d.type === 'status_disagreement');
        if (!isAlreadyStatusFlagged) {
          const maxModels = validResults.filter(vr => vr.result.score === maxScore).map(vr => vr.runSummary.modelName);
          const minModels = validResults.filter(vr => vr.result.score === minScore).map(vr => vr.runSummary.modelName);
          disagreements.push({
            caseId: c.id,
            caseName: c.name,
            type: 'score_gap',
            explanation: `Large score gap of ${Math.round(gap)}%: ${maxModels.join(', ')} scored ${Math.round(maxScore)}%, whereas ${minModels.join(', ')} scored ${Math.round(minScore)}%.`,
            severity: 'medium',
            modelsInvolved: validResults.map(vr => vr.runSummary.modelName)
          });
        }
      }
    }
    
    // 4. Evidence Mismatch
    if (distinctEvidence.length > 1) {
      const yesModels = validResults.filter(vr => vr.result.evidenceMatched).map(vr => vr.runSummary.modelName);
      const noModels = validResults.filter(vr => !vr.result.evidenceMatched).map(vr => vr.runSummary.modelName);
      
      // Only add evidence mismatch disagreement if not already status-flagged high severity
      const hasHighStatusDisagreement = disagreements.some(d => d.caseId === c.id && d.type === 'status_disagreement' && d.severity === 'high');
      
      if (!hasHighStatusDisagreement) {
        disagreements.push({
          caseId: c.id,
          caseName: c.name,
          type: 'evidence_mismatch',
          explanation: `Evidence coverage mismatch: ${yesModels.join(', ')} successfully cited required evidence, while ${noModels.join(', ')} did not.`,
          severity: 'high',
          modelsInvolved: validResults.map(vr => vr.runSummary.modelName)
        });
      }
    }
    
    // 5. Latency Spread
    if (latencies.length >= 2) {
      const minLatency = Math.min(...latencies);
      const maxLatency = Math.max(...latencies);
      if (minLatency > 0 && maxLatency >= 2 * minLatency && (maxLatency - minLatency) >= 500) {
        const slowModels = validResults.filter(vr => (vr.result.latencyMs || 0) === maxLatency).map(vr => vr.runSummary.modelName);
        const fastModels = validResults.filter(vr => (vr.result.latencyMs || 0) === minLatency).map(vr => vr.runSummary.modelName);
        disagreements.push({
          caseId: c.id,
          caseName: c.name,
          type: 'latency_spread',
          explanation: `Significant latency spread: ${slowModels.join(', ')} was slow (${maxLatency}ms), while ${fastModels.join(', ')} finished ${Math.round(maxLatency / minLatency)}x faster (${minLatency}ms).`,
          severity: 'low',
          modelsInvolved: validResults.map(vr => vr.runSummary.modelName)
        });
      }
    }
  });
  
  return disagreements;
}

export function diagnoseWinner(runs: RunSummary[], disagreements: Disagreement[]): DiagnosisPanel {
  if (runs.length === 0) {
    return {
      bestScoringRun: null,
      fastestRun: null,
      mostReliableRun: null,
      mostConsistentRun: null,
      mostFailuresRun: null,
      casesNeedingReviewCount: 0
    };
  }
  
  // Best scoring: highest average score. In case of ties, take the first.
  const bestScoringRun = [...runs].sort((a, b) => b.averageScore - a.averageScore)[0];
  
  // Fastest: lowest average latency.
  const runsWithLatency = runs.filter(r => r.averageLatencyMs > 0);
  const fastestRun = runsWithLatency.length > 0
    ? [...runsWithLatency].sort((a, b) => a.averageLatencyMs - b.averageLatencyMs)[0]
    : null;
    
  // Most reliable: fewest provider errors and failed results (failCount).
  // Reliability score = failCount + (errorMessage ? 10 : 0) -- lower is better
  const mostReliableRun = [...runs].sort((a, b) => {
    const costA = a.failCount + (a.errorMessage ? 10 : 0);
    const costB = b.failCount + (b.errorMessage ? 10 : 0);
    if (costA !== costB) return costA - costB;
    return b.averageScore - a.averageScore; // tie-break with score
  })[0];
  
  // Most consistent: lowest score variance/standard deviation, or highest pass count with lowest failures.
  // Let's compute a simple standard deviation if easy, or use passCount / failCount consistency.
  // Since we don't have individual scores easily in this run summary, let's treat averageScore - (failCount * 5) as consistency,
  // or a simple heuristic: highest pass rate relative to average. Let's just find the run with the highest pass count.
  // Actually, consistency can be defined as the run with the lowest fail count and highest pass count.
  const mostConsistentRun = [...runs].sort((a, b) => {
    const scoreDiffA = Math.abs(a.averageScore - 50); // variance around center is bad, we want high steady scores
    const failA = a.failCount;
    const failB = b.failCount;
    if (failA !== failB) return failA - failB;
    return b.averageScore - a.averageScore;
  })[0];
  
  // Most failures: highest failCount
  const mostFailuresRun = [...runs].sort((a, b) => b.failCount - a.failCount)[0];
  
  // Cases needing review count: medium or high severity disagreements
  const reviewCount = disagreements.filter(d => d.severity === 'high' || d.severity === 'medium').length;
  
  return {
    bestScoringRun,
    fastestRun,
    mostReliableRun,
    mostConsistentRun,
    mostFailuresRun: mostFailuresRun.failCount > 0 ? mostFailuresRun : null,
    casesNeedingReviewCount: reviewCount
  };
}
