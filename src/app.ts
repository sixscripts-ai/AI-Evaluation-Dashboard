import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  getDb, saveDb, addSuite, addCase, addSource, generateId 
} from './db.js';
import { SuiteSchema, TestCaseSchema, RunSchema } from './validators.js';
import { simulateCase, detectRegressions, buildCaseResult, checkEvidenceMatch } from './scoring.js';
import { EvalRun, EvalResult, Regression, RunMode, ProviderId } from './types.js';
import { getRunner, listProviders, getProviderInfo } from './lib/model-providers/index.js';
import { buildEvalPrompt } from './lib/eval-prompt.js';

let currentDirname = '';
try {
  if (typeof __dirname !== 'undefined') {
    currentDirname = __dirname;
  } else {
    currentDirname = path.dirname(fileURLToPath(import.meta.url));
  }
} catch (e) {
  currentDirname = path.dirname(fileURLToPath(import.meta.url));
}

const STORE_PATH = path.join(currentDirname, '..', 'src', 'db-store.json');

// --- Express App ---
const app = express();

// Body parser
app.use(express.json());

// Ensure DB gets initialized and seeded on start
getDb();

// ==================== API ENDPOINTS ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Dashboard Metrics
app.get('/api/dashboard', (req, res) => {
  const db = getDb();
  
  const completedRuns = db.runs.filter(r => r.status === 'completed');
  let latestRunScore = 0;
  let avgLatency = 0;
  
  if (completedRuns.length > 0) {
    const sorted = [...completedRuns].sort((a, b) => 
      new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
    );
    latestRunScore = sorted[0].averageScore || 0;
    
    const runsWithLatency = completedRuns.filter(r => r.averageLatencyMs !== undefined);
    if (runsWithLatency.length > 0) {
      const sum = runsWithLatency.reduce((acc, r) => acc + (r.averageLatencyMs || 0), 0);
      avgLatency = Math.round(sum / runsWithLatency.length);
    }
  }

  let totalPass = 0;
  let totalPartial = 0;
  let totalFail = 0;

  const allResults = db.results;
  if (allResults.length > 0) {
    allResults.forEach(r => {
      if (r.status === 'pass') totalPass++;
      else if (r.status === 'partial') totalPartial++;
      else if (r.status === 'fail') totalFail++;
    });
  }

  const recentRunsJoined = [...db.runs]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10)
    .map(run => {
      const suite = db.suites.find(s => s.id === run.suiteId);
      return {
        ...run,
        suiteName: suite ? suite.name : 'Unknown Suite',
      };
    });

  res.json({
    totalSuites: db.suites.length,
    totalTestCases: db.cases.length,
    latestRunScore: Math.round(latestRunScore),
    passRate: totalPass,
    partialRate: totalPartial,
    failRate: totalFail,
    totalRegressions: db.regressions.length,
    averageLatency: avgLatency || 1240,
    recentRuns: recentRunsJoined
  });
});

// 2. Suites
app.get('/api/suites', (req, res) => {
  const db = getDb();
  const suitesWithStats = db.suites.map(suite => {
    const suiteCases = db.cases.filter(c => c.suiteId === suite.id);
    const suiteRuns = db.runs.filter(r => r.suiteId === suite.id && r.status === 'completed');
    
    let lastScore: number | undefined = undefined;
    if (suiteRuns.length > 0) {
      const sorted = [...suiteRuns].sort((a, b) => 
        new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
      );
      lastScore = sorted[0].averageScore;
    }

    return {
      ...suite,
      caseCount: suiteCases.length,
      runCount: db.runs.filter(r => r.suiteId === suite.id).length,
      lastRunScore: lastScore
    };
  });
  res.json(suitesWithStats);
});

app.get('/api/suites/:id', (req, res) => {
  const db = getDb();
  const suite = db.suites.find(s => s.id === req.params.id);
  if (!suite) {
    return res.status(404).json({ error: 'Suite not found' });
  }

  const suiteCases = db.cases.filter(c => c.suiteId === suite.id);
  const suiteRuns = db.runs
    .filter(r => r.suiteId === suite.id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  res.json({
    suite,
    cases: suiteCases,
    runs: suiteRuns
  });
});

app.post('/api/suites', (req, res) => {
  const parsed = SuiteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }

  const newSuite = addSuite(parsed.data);
  res.status(201).json(newSuite);
});

// 3. Test Cases
app.post('/api/suites/:id/cases', (req, res) => {
  const db = getDb();
  const suite = db.suites.find(s => s.id === req.params.id);
  if (!suite) {
    return res.status(404).json({ error: 'Suite not found' });
  }

  const parsed = TestCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }

  const { tagsInput, ...rest } = parsed.data;
  const tags = tagsInput 
    ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)
    : [];

  const newCase = addCase({
    ...rest,
    suiteId: suite.id,
    tags
  });

  const newSource = addSource({
    caseId: newCase.id,
    title: `Reference Guideline Source: ${newCase.name}`,
    sourceType: 'document',
    excerpt: newCase.requiredEvidence,
    metadata: { autoGenerated: true }
  });

  res.status(201).json({ case: newCase, source: newSource });
});

app.get('/api/cases/:id', (req, res) => {
  const db = getDb();
  const testCase = db.cases.find(c => c.id === req.params.id);
  if (!testCase) {
    return res.status(404).json({ error: 'Test case not found' });
  }

  const suite = db.suites.find(s => s.id === testCase.suiteId);
  const caseSources = db.sources.filter(s => s.caseId === testCase.id);

  const caseResultsWithRun = db.results
    .filter(r => r.caseId === testCase.id)
    .map(result => {
      const run = db.runs.find(rn => rn.id === result.runId);
      return {
        ...result,
        runModel: run?.modelName || 'Unknown Model',
        runVersion: run?.systemVersion || 'Unknown Target',
        runDate: run?.completedAt || result.createdAt
      };
    })
    .sort((a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime());

  res.json({
    testCase,
    suite,
    sources: caseSources,
    history: caseResultsWithRun
  });
});

// 4. Runs
app.get('/api/runs', (req, res) => {
  const db = getDb();
  const runsJoined = db.runs.map(run => {
    const suite = db.suites.find(s => s.id === run.suiteId);
    const regressionCount = db.regressions.filter(reg => reg.runId === run.id).length;
    return {
      ...run,
      suiteName: suite ? suite.name : 'Unknown Suite',
      regressionCount
    };
  }).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  res.json(runsJoined);
});

app.get('/api/runs/:id', (req, res) => {
  const db = getDb();
  const run = db.runs.find(r => r.id === req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'Eval Run not found' });
  }

  const suite = db.suites.find(s => s.id === run.suiteId);
  
  const runResults = db.results
    .filter(res => res.runId === run.id)
    .map(result => {
      const tc = db.cases.find(c => c.id === result.caseId);
      return {
        ...result,
        testCase: tc || null
      };
    });

  const runRegressions = db.regressions
    .filter(reg => reg.runId === run.id)
    .map(reg => {
      const tc = db.cases.find(c => c.id === reg.caseId);
      return {
        ...reg,
        testCase: tc || null
      };
    });

  res.json({
    run,
    suiteName: suite ? suite.name : 'Unknown Suite',
    results: runResults,
    regressions: runRegressions
  });
});

// Create & simulate a run
app.post('/api/runs', (req, res) => {
  const parsed = RunSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }

  const db = getDb();
  const { suiteId, modelName, systemVersion, notes, profile } = parsed.data;

  const suite = db.suites.find(s => s.id === suiteId);
  if (!suite) {
    return res.status(404).json({ error: 'Target evaluation suite not found.' });
  }

  const suiteCases = db.cases.filter(c => c.suiteId === suiteId && c.isActive);
  if (suiteCases.length === 0) {
    return res.status(400).json({ error: 'Cannot trigger evaluation. No active test cases found in this suite.' });
  }

  const runId = generateId('run');
  const startedAt = new Date().toISOString();

  const currentResults: EvalResult[] = [];
  let scoreSum = 0;
  let latencySum = 0;
  let passCount = 0;
  let partialCount = 0;
  let failCount = 0;

  for (const tc of suiteCases) {
    const sim = simulateCase(tc, profile);
    const resId = generateId('res');
    
    const rDetail: EvalResult = {
      id: resId,
      runId,
      caseId: tc.id,
      actualOutput: sim.actualOutput,
      status: sim.status,
      score: sim.score,
      latencyMs: sim.latencyMs,
      failureReason: sim.failureReason,
      evidenceMatched: sim.evidenceMatched,
      evidenceCoverageScore: sim.evidenceCoverageScore,
      assertions: sim.assertions,
      notes: sim.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    currentResults.push(rDetail);
    scoreSum += sim.score;
    latencySum += sim.latencyMs;

    if (sim.status === 'pass') passCount++;
    else if (sim.status === 'partial') partialCount++;
    else if (sim.status === 'fail') failCount++;
  }

  const avgScore = scoreSum / suiteCases.length;
  const avgLatency = Math.round(latencySum / suiteCases.length);

  const suiteCompletedRuns = db.runs
    .filter(r => r.suiteId === suiteId && r.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime());

  let computedRegressions: Regression[] = [];
  if (suiteCompletedRuns.length > 0) {
    const prevRun = suiteCompletedRuns[0];
    const prevResults = db.results.filter(res => res.runId === prevRun.id);
    
    computedRegressions = detectRegressions(currentResults, prevResults);
  }

  const newRun: EvalRun = {
    id: runId,
    suiteId,
    modelName,
    systemVersion,
    status: 'completed',
    startedAt,
    completedAt: new Date().toISOString(),
    averageScore: Math.round(avgScore * 100) / 100,
    passCount,
    partialCount,
    failCount,
    averageLatencyMs: avgLatency,
    notes,
    provider: 'gemini',
    runMode: 'simulated',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.runs.unshift(newRun);
  db.results.push(...currentResults);
  db.regressions.push(...computedRegressions);

  saveDb(db);

  res.status(201).json({
    runId,
    averageScore: newRun.averageScore,
    regressionCount: computedRegressions.length,
    regressions: computedRegressions
  });
});

// 5. Sources
app.get('/api/sources', (req, res) => {
  const db = getDb();
  const sourcesJoined = db.sources.map(source => {
    const tc = db.cases.find(c => c.id === source.caseId);
    const suite = tc ? db.suites.find(s => s.id === tc.suiteId) : null;
    return {
      ...source,
      caseName: tc?.name || 'Isolated Source',
      suiteName: suite?.name || 'Unassigned'
    };
  });
  res.json(sourcesJoined);
});

// 6. Provider availability (no key material is exposed; only booleans).
app.get('/api/providers', (req, res) => {
  res.json({
    providers: listProviders(),
    defaultProvider: process.env.DEFAULT_MODEL_PROVIDER || 'gemini',
    defaultModel: process.env.DEFAULT_MODEL_NAME || 'gemini-2.5-flash',
  });
});

// 7. Real or simulated model run for a suite.
//
//    Body:
//      - provider: 'gemini' | 'groq' | 'openrouter'  (required if runMode === 'real')
//      - model: string                                (required if runMode === 'real')
//      - systemVersion: string
//      - runMode: 'simulated' | 'real'                 (default 'simulated')
//      - notes: string
//      - profile: 'optimized' | 'average' | 'stale'   (only used in simulated mode)
//
//    Behavior:
//      - Loads the suite and its active test cases (max 10).
//      - For each case, calls the selected provider runner with a
//        deterministic eval prompt and records the actual output,
//        latency, token usage, and any provider error.
//      - Runs the existing rule-based assertion engine against the
//        actual output.
//      - Computes a run summary and runs regression detection against
//        the previous completed run for the same suite.
//
app.post('/api/suites/:id/run-model', async (req, res) => {
  const db = getDb();
  const suite = db.suites.find((s) => s.id === req.params.id);
  if (!suite) {
    return res.status(404).json({ error: 'Target evaluation suite not found.' });
  }

  const body = (req.body || {}) as {
    provider?: ProviderId;
    model?: string;
    systemVersion?: string;
    runMode?: RunMode;
    notes?: string;
    profile?: 'optimized' | 'average' | 'stale';
  };

  const runMode: RunMode = body.runMode === 'real' ? 'real' : 'simulated';
  const systemVersion = (body.systemVersion || '').trim();

  if (!systemVersion) {
    return res.status(400).json({ error: 'A systemVersion string is required (e.g. "v1.2-rc4").' });
  }

  const providerId: ProviderId = (body.provider || 'gemini') as ProviderId;
  const modelName = (body.model || '').trim() || getProviderInfo(providerId).defaultModel;

  // Real mode: validate that a key is present before we start.
  if (runMode === 'real') {
    const info = getProviderInfo(providerId);
    if (!info.available) {
      return res.status(400).json({
        error: `Cannot run real evaluation: ${info.envVar} is not set in the server environment.`,
        provider: providerId,
        envVar: info.envVar,
      });
    }
  }

  const allActive = db.cases.filter((c) => c.suiteId === suite.id && c.isActive);
  if (allActive.length === 0) {
    return res.status(400).json({ error: 'Cannot trigger evaluation. No active test cases found in this suite.' });
  }
  // Real runs are capped at 10 cases to keep serverless invocations bounded.
  const limit = runMode === 'real' ? 10 : allActive.length;
  const suiteCases = allActive.slice(0, limit);
  if (runMode === 'real' && allActive.length > limit) {
    console.warn(`[EvalBench] Real run truncated from ${allActive.length} to ${limit} cases.`);
  }

  const runId = generateId('run');
  const startedAt = new Date().toISOString();

  const currentResults: EvalResult[] = [];
  let scoreSum = 0;
  let latencySum = 0;
  let passCount = 0;
  let partialCount = 0;
  let failCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTokens = 0;
  let tokenCountsRecorded = 0;
  let runErrorMessage: string | undefined;

  const runner = runMode === 'real' ? getRunner(providerId) : null;

  for (const tc of suiteCases) {
    if (runMode === 'simulated') {
      // Simulated path: use the existing deterministic profiles.
      const profile = body.profile || 'average';
      const sim = simulateCase(tc, profile);
      const r: EvalResult = {
        id: generateId('res'),
        runId,
        caseId: tc.id,
        actualOutput: sim.actualOutput,
        status: sim.status,
        score: sim.score,
        latencyMs: sim.latencyMs,
        failureReason: sim.failureReason,
        evidenceMatched: sim.evidenceMatched,
        evidenceCoverageScore: sim.evidenceCoverageScore,
        assertions: sim.assertions,
        notes: sim.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      currentResults.push(r);
      scoreSum += sim.score;
      latencySum += sim.latencyMs;
      if (sim.status === 'pass') passCount++;
      else if (sim.status === 'partial') partialCount++;
      else if (sim.status === 'fail') failCount++;
    } else {
      // Real path: build prompt, call provider, score assertions, store
      // everything. We continue to the next case even if one fails.
      const caseSources = db.sources.filter((s) => s.caseId === tc.id);
      const { systemPrompt, input } = buildEvalPrompt({
        testCase: tc,
        evidenceSources: caseSources,
      });

      let providerOut;
      try {
        providerOut = await runner!.runModel({
          provider: providerId,
          model: modelName,
          systemPrompt,
          input,
        });
      } catch (err: any) {
        providerOut = {
          output: '',
          latencyMs: 0,
          error: `Provider call threw: ${err?.message || 'unknown error'}.`,
        };
      }

      if (providerOut.error && !providerOut.output) {
        // Per-case provider failure: record a failed result and continue.
        const failResult: EvalResult = {
          id: generateId('res'),
          runId,
          caseId: tc.id,
          actualOutput: '',
          status: 'fail',
          score: 0,
          latencyMs: providerOut.latencyMs,
          failureReason: providerOut.error,
          evidenceMatched: false,
          evidenceCoverageScore: 0,
          assertions: [
            {
              id: generateId('as_eval'),
              type: 'latencyLessThanMs',
              status: 'fail',
              expected: 'Provider responded with output',
              actual: providerOut.error || 'no output',
              explanation: `Provider call failed: ${providerOut.error}`,
            },
          ],
          notes: `Provider error: ${providerOut.error}`,
          providerLatencyMs: providerOut.latencyMs,
          providerError: providerOut.error,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        currentResults.push(failResult);
        failCount++;
        // We don't add scoreSum/latencySum for fully failed cases.
        if (typeof providerOut.inputTokens === 'number') totalInputTokens += providerOut.inputTokens;
        if (typeof providerOut.outputTokens === 'number') totalOutputTokens += providerOut.outputTokens;
        if (typeof providerOut.totalTokens === 'number') totalTokens += providerOut.totalTokens;
        continue;
      }

      const ev = checkEvidenceMatch(providerOut.output, tc.requiredEvidence);
      const built = buildCaseResult({
        runId,
        caseId: tc.id,
        actualOutput: providerOut.output,
        latencyMs: providerOut.latencyMs,
        requiredEvidenceMatched: ev.matched,
        evidenceCoverageScore: ev.coverageScore,
        failureReason: providerOut.error,
        notes: `Real run via ${providerId}/${modelName}.`,
        expectedOutput: tc.expectedOutput,
        requiredEvidence: tc.requiredEvidence,
      });
      // Attach provider-specific metadata.
      built.providerLatencyMs = providerOut.latencyMs;
      built.providerError = providerOut.error;
      built.inputTokens = providerOut.inputTokens;
      built.outputTokens = providerOut.outputTokens;
      built.totalTokens = providerOut.totalTokens;

      currentResults.push(built);
      scoreSum += built.score;
      latencySum += built.latencyMs;
      if (built.status === 'pass') passCount++;
      else if (built.status === 'partial') partialCount++;
      else if (built.status === 'fail') failCount++;

      if (typeof providerOut.inputTokens === 'number') totalInputTokens += providerOut.inputTokens;
      if (typeof providerOut.outputTokens === 'number') totalOutputTokens += providerOut.outputTokens;
      if (typeof providerOut.totalTokens === 'number') totalTokens += providerOut.totalTokens;
      if (
        typeof providerOut.inputTokens === 'number' ||
        typeof providerOut.outputTokens === 'number' ||
        typeof providerOut.totalTokens === 'number'
      ) {
        tokenCountsRecorded++;
      }
    }
  }

  const casesScored = currentResults.length;
  const avgScore = casesScored > 0 ? scoreSum / casesScored : 0;
  const avgLatency = casesScored > 0 ? Math.round(latencySum / casesScored) : 0;

  // Regression detection against the previous completed run for this suite.
  const suiteCompletedRuns = db.runs
    .filter((r) => r.suiteId === suite.id && r.status === 'completed')
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.startedAt).getTime() -
        new Date(a.completedAt || a.startedAt).getTime()
    );

  let computedRegressions: Regression[] = [];
  if (suiteCompletedRuns.length > 0) {
    const prevRun = suiteCompletedRuns[0];
    const prevResults = db.results.filter((res) => res.runId === prevRun.id);
    computedRegressions = detectRegressions(currentResults, prevResults);
  }

  // Run-level status: if every case failed with the same global error,
  // mark the run as failed. We use a simple heuristic: if there is at
  // least one provider error string that appears on every result, we
  // record a run-level error message.
  if (runMode === 'real' && currentResults.length > 0) {
    const errors = currentResults
      .map((r) => r.providerError)
      .filter((e): e is string => Boolean(e));
    if (errors.length === currentResults.length) {
      const first = errors[0];
      runErrorMessage = first;
    }
  }

  const newRun: EvalRun = {
    id: runId,
    suiteId: suite.id,
    modelName: runMode === 'real' ? modelName : modelName || 'simulated',
    systemVersion,
    status: 'completed',
    startedAt,
    completedAt: new Date().toISOString(),
    averageScore: Math.round(avgScore * 100) / 100,
    passCount,
    partialCount,
    failCount,
    averageLatencyMs: avgLatency,
    notes: body.notes,
    provider: runMode === 'real' ? providerId : 'simulated',
    runMode,
    errorMessage: runErrorMessage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (runMode === 'real' && tokenCountsRecorded > 0) {
    newRun.totalInputTokens = totalInputTokens;
    newRun.totalOutputTokens = totalOutputTokens;
    newRun.totalTokens = totalTokens;
  }

  db.runs.unshift(newRun);
  db.results.push(...currentResults);
  db.regressions.push(...computedRegressions);
  saveDb(db);

  res.status(201).json({
    runId,
    runMode,
    provider: newRun.provider,
    model: newRun.modelName,
    averageScore: newRun.averageScore,
    averageLatencyMs: newRun.averageLatencyMs,
    totalInputTokens: newRun.totalInputTokens,
    totalOutputTokens: newRun.totalOutputTokens,
    totalTokens: newRun.totalTokens,
    regressionCount: computedRegressions.length,
    errorMessage: runErrorMessage,
    casesScored,
    casesTotal: allActive.length,
    truncated: runMode === 'real' && allActive.length > limit,
  });
});

// Reset database
app.post('/api/settings/reset', async (req, res) => {
  const fs = await import('fs');
  try {
    if (fs.existsSync(STORE_PATH)) {
      fs.unlinkSync(STORE_PATH);
    }
  } catch (e) {}

  const freshDb = getDb();
  res.json({ message: 'Database reset and seeded successfully!', state: freshDb });
});

// ==================== PRODUCTION STATIC SERVING ====================
// Serve built frontend assets in production / Vercel
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
