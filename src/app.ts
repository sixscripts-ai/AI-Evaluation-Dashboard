import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  getAllSuites, getSuiteById, createSuite,
  getAllCases, getCasesBySuiteId, getCaseById, createCaseWithSource, updateCase,
  getAllSources, getSourcesByCaseId,
  getAllRuns, getCompletedRuns, getCompletedRunsBySuiteId, getRunById, getRunsBySuiteId, getResultsByRunId, getResultsByCaseId, getAllResults, getRegressionsByRunId, getAllRegressions, createRunData
} from './lib/repositories/index.js';
import { generateId } from './lib/db.js';
import { SuiteSchema, TestCaseSchema, RunSchema } from './validators.js';
import { simulateCase, detectRegressions, buildCaseResult, checkEvidenceMatch } from './scoring.js';
import { EvalRun, EvalResult, Regression, RunMode, ProviderId } from './types.js';
import { getRunner, listProviders, getProviderInfo } from './lib/model-providers/index.js';
import { buildEvalPrompt } from './lib/eval-prompt.js';

// --- Express App ---
const app = express();

// Body parser
app.use(express.json());



// ==================== API ENDPOINTS ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Dashboard Metrics
app.get('/api/dashboard', async (req, res) => {
  const suites = await getAllSuites();
  const cases = await getAllCases();
  const runs = await getAllRuns();
  const results = await getAllResults();
  const regressions = await getAllRegressions();
  
  const completedRuns = runs.filter(r => r.status === 'completed');
  let latestRunScore = 0;
  let avgLatency = 0;
  
  if (completedRuns.length > 0) {
    latestRunScore = completedRuns[0].averageScore || 0;
    
    const runsWithLatency = completedRuns.filter(r => r.averageLatencyMs !== null);
    if (runsWithLatency.length > 0) {
      const sum = runsWithLatency.reduce((acc, r) => acc + (r.averageLatencyMs || 0), 0);
      avgLatency = Math.round(sum / runsWithLatency.length);
    }
  }

  let totalPass = 0;
  let totalPartial = 0;
  let totalFail = 0;

  if (results.length > 0) {
    results.forEach(r => {
      if (r.status === 'pass') totalPass++;
      else if (r.status === 'partial') totalPartial++;
      else if (r.status === 'fail') totalFail++;
    });
  }

  const recentRunsJoined = runs
    .slice(0, 10)
    .map(run => {
      const suite = suites.find(s => s.id === run.suiteId);
      return {
        ...run,
        suiteName: suite ? suite.name : 'Unknown Suite',
      };
    });

  res.json({
    totalSuites: suites.length,
    totalTestCases: cases.length,
    latestRunScore: Math.round(latestRunScore),
    passRate: totalPass,
    partialRate: totalPartial,
    failRate: totalFail,
    totalRegressions: regressions.length,
    averageLatency: avgLatency || 1240,
    recentRuns: recentRunsJoined
  });
});

// 2. Suites
app.get('/api/suites', async (req, res) => {
  const suites = await getAllSuites();
  const cases = await getAllCases();
  const runs = await getCompletedRuns();
  
  const suitesWithStats = suites.map(suite => {
    const suiteCases = cases.filter(c => c.suiteId === suite.id);
    const suiteRuns = runs.filter(r => r.suiteId === suite.id);
    
    let lastScore: number | undefined = undefined;
    if (suiteRuns.length > 0) {
      lastScore = suiteRuns[0].averageScore !== null ? suiteRuns[0].averageScore : undefined;
    }

    return {
      ...suite,
      caseCount: suiteCases.length,
      runCount: suiteRuns.length,
      lastRunScore: lastScore
    };
  });
  res.json(suitesWithStats);
});

app.get('/api/suites/:id', async (req, res) => {
  const suite = await getSuiteById(req.params.id);
  if (!suite) {
    return res.status(404).json({ error: 'Suite not found' });
  }

  const suiteCases = await getCasesBySuiteId(suite.id);
  const suiteRuns = await getRunsBySuiteId(suite.id);

  res.json({
    suite,
    cases: suiteCases,
    runs: suiteRuns
  });
});

app.post('/api/suites', async (req, res) => {
  const parsed = SuiteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }

  const newSuite = await createSuite(parsed.data);
  res.status(201).json(newSuite);
});

// 3. Test Cases
app.post('/api/suites/:id/cases', async (req, res) => {
  const suite = await getSuiteById(req.params.id);
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

  const { newCase, newSource } = await createCaseWithSource({
    ...rest,
    suiteId: suite.id,
    tags,
  });

  res.status(201).json({ case: newCase, source: newSource });
});

app.get('/api/cases/:id', async (req, res) => {
  const testCase = await getCaseById(req.params.id);
  if (!testCase) {
    return res.status(404).json({ error: 'Test case not found' });
  }

  const suite = await getSuiteById(testCase.suiteId);
  const caseSources = await getSourcesByCaseId(testCase.id);
  const allRuns = await getAllRuns();
  const caseResults = await getResultsByCaseId(testCase.id);

  const caseResultsWithRun = caseResults
    .map(result => {
      const run = allRuns.find(rn => rn.id === result.runId);
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

app.put('/api/cases/:id', async (req, res) => {
  const testCase = await getCaseById(req.params.id);
  if (!testCase) {
    return res.status(404).json({ error: 'Test case not found' });
  }

  const parsed = TestCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }

  const { tagsInput, ...rest } = parsed.data;
  const tags = tagsInput 
    ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)
    : [];

  const updatedCase = await updateCase(testCase.id, {
    ...rest,
    tags
  });

  res.json(updatedCase);
});

// 4. Runs
app.get('/api/runs', async (req, res) => {
  const runs = await getAllRuns();
  const suites = await getAllSuites();
  const regressions = await getAllRegressions();

  const runsJoined = runs.map(run => {
    const suite = suites.find(s => s.id === run.suiteId);
    const regressionCount = regressions.filter(reg => reg.runId === run.id).length;
    return {
      ...run,
      suiteName: suite ? suite.name : 'Unknown Suite',
      regressionCount
    };
  });

  res.json(runsJoined);
});

app.get('/api/runs/:id', async (req, res) => {
  const run = await getRunById(req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'Eval Run not found' });
  }

  const suite = await getSuiteById(run.suiteId);
  const cases = await getAllCases();
  const runResults = await getResultsByRunId(run.id);
  const runRegressions = await getRegressionsByRunId(run.id);
  
  const resultsWithCases = runResults.map(result => {
    const tc = cases.find(c => c.id === result.caseId);
    return {
      ...result,
      testCase: tc || null
    };
  });

  const regressionsWithCases = runRegressions.map(reg => {
    const tc = cases.find(c => c.id === reg.caseId);
    return {
      ...reg,
      testCase: tc || null
    };
  });

  res.json({
    run,
    suiteName: suite ? suite.name : 'Unknown Suite',
    results: resultsWithCases,
    regressions: regressionsWithCases
  });
});

// Create & simulate a run
app.post('/api/runs', async (req, res) => {
  const parsed = RunSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }

  const { suiteId, modelName, systemVersion, notes, profile } = parsed.data;

  const suite = await getSuiteById(suiteId);
  if (!suite) {
    return res.status(404).json({ error: 'Target evaluation suite not found.' });
  }

  const cases = await getCasesBySuiteId(suiteId);
  const suiteCases = cases.filter(c => c.isActive);
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
    const sim = simulateCase(tc as any, profile);
    const resId = generateId('res');
    
    const rDetail: EvalResult = {
      id: resId,
      runId,
      caseId: tc.id,
      actualOutput: sim.actualOutput,
      status: sim.status,
      score: sim.score,
      latencyMs: sim.latencyMs,
      failureReason: sim.failureReason || null,
      evidenceMatched: sim.evidenceMatched,
      evidenceCoverageScore: sim.evidenceCoverageScore,
      assertions: sim.assertions,
      notes: sim.notes || null,
      providerLatencyMs: null,
      providerError: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
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

  const suiteCompletedRuns = await getCompletedRunsBySuiteId(suiteId);

  let computedRegressions: Regression[] = [];
  if (suiteCompletedRuns.length > 0) {
    const prevRun = suiteCompletedRuns[0];
    const prevResults = await getResultsByRunId(prevRun.id);
    
    computedRegressions = detectRegressions(currentResults as any, prevResults as any);
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
    notes: notes || null,
    provider: 'simulated',
    runMode: 'simulated',
    errorMessage: null,
    totalInputTokens: null,
    totalOutputTokens: null,
    totalTokens: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await createRunData(newRun, currentResults, computedRegressions);

  res.status(201).json({
    runId,
    averageScore: newRun.averageScore,
    regressionCount: computedRegressions.length,
    regressions: computedRegressions
  });
});

// 5. Sources
app.get('/api/sources', async (req, res) => {
  const sources = await getAllSources();
  const cases = await getAllCases();
  const suites = await getAllSuites();

  const sourcesJoined = sources.map(source => {
    const tc = cases.find(c => c.id === source.caseId);
    const suite = tc ? suites.find(s => s.id === tc.suiteId) : null;
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
  const suite = await getSuiteById(req.params.id);
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

  const cases = await getCasesBySuiteId(suite.id);
  const allActive = cases.filter((c) => c.isActive);
  if (allActive.length === 0) {
    return res.status(400).json({ error: 'Cannot trigger evaluation. No active test cases found in this suite.' });
  }

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
      const profile = body.profile || 'average';
      const sim = simulateCase(tc as any, profile);
      const r: EvalResult = {
        id: generateId('res'),
        runId,
        caseId: tc.id,
        actualOutput: sim.actualOutput,
        status: sim.status,
        score: sim.score,
        latencyMs: sim.latencyMs,
        failureReason: sim.failureReason || null,
        evidenceMatched: sim.evidenceMatched,
        evidenceCoverageScore: sim.evidenceCoverageScore,
        assertions: sim.assertions,
        notes: sim.notes || null,
        providerLatencyMs: null,
        providerError: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
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
      const caseSources = await getSourcesByCaseId(tc.id);
      const { systemPrompt, input } = buildEvalPrompt({
        testCase: tc as any,
        evidenceSources: caseSources as any,
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
        const failResult: EvalResult = {
          id: generateId('res'),
          runId,
          caseId: tc.id,
          actualOutput: '',
          status: 'fail',
          score: 0,
          latencyMs: providerOut.latencyMs || 0,
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
          providerLatencyMs: providerOut.latencyMs || null,
          providerError: providerOut.error,
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        currentResults.push(failResult);
        failCount++;
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
        latencyMs: providerOut.latencyMs || 0,
        requiredEvidenceMatched: ev.matched,
        evidenceCoverageScore: ev.coverageScore,
        failureReason: providerOut.error,
        notes: `Real run via ${providerId}/${modelName}.`,
        assertions: tc.assertions as any,
      });
      built.providerLatencyMs = providerOut.latencyMs || null;
      built.providerError = providerOut.error || null;
      built.inputTokens = providerOut.inputTokens || null;
      built.outputTokens = providerOut.outputTokens || null;
      built.totalTokens = providerOut.totalTokens || null;

      currentResults.push(built as any);
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

  const suiteCompletedRuns = await getCompletedRunsBySuiteId(suite.id);

  let computedRegressions: Regression[] = [];
  if (suiteCompletedRuns.length > 0) {
    const prevRun = suiteCompletedRuns[0];
    const prevResults = await getResultsByRunId(prevRun.id);
    computedRegressions = detectRegressions(currentResults as any, prevResults as any);
  }

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
    notes: body.notes || null,
    provider: runMode === 'real' ? providerId : 'simulated',
    runMode,
    errorMessage: runErrorMessage || null,
    totalInputTokens: null,
    totalOutputTokens: null,
    totalTokens: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (runMode === 'real' && tokenCountsRecorded > 0) {
    newRun.totalInputTokens = totalInputTokens;
    newRun.totalOutputTokens = totalOutputTokens;
    newRun.totalTokens = totalTokens;
  }

  await createRunData(newRun, currentResults, computedRegressions);

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
  res.json({ message: 'Database reset must now be run via CLI `npm run db:seed` or `npm run db:migrate` since migrating to Postgres.', state: {} });
});

// ==================== PRODUCTION STATIC SERVING ====================
// Serve built frontend assets in production / Vercel
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
