# Custom Assertions & Scoring

EvalBench evaluates AI model outputs through **Assertion Rules**. These are deterministic checks configured dynamically on each test case via the Custom Assertion Builder.

## Assertion Rules

Rather than hardcoded heuristics, users can define arrays of `AssertionRule`s for each `EvalCase`.

An `AssertionRule` consists of:
- **Type**: The type of assertion (e.g. `outputIncludes`, `latencyLessThanMs`).
- **Expected Value**: The configured target for the assertion.
- **Weight**: How many points the assertion contributes to the overall score (usually 10-40).

### Supported Assertion Templates

1. `outputIncludes`: The actual output contains the expected string.
2. `outputExcludes`: The actual output does NOT contain the expected string.
3. `exactMatch`: The actual output matches the expected string exactly.
4. `regexMatch`: The actual output matches a regular expression.
5. `evidenceIncludes`: The actual output references required evidence anchors.
6. `evidenceMissing`: The actual output fails to reference evidence anchors.
7. `classificationEquals`: Equivalent to exact match, designed for short classification labels.
8. `jsonFieldEquals`: Validates a specific JSON path matches an expected value.
9. `scoreAtLeast`: The run score meets a minimum threshold.
10. `latencyLessThanMs`: The provider latency is below the configured millisecond SLA.

## Assertion Engine

When an evaluation runs, the scoring engine (`src/scoring.ts`) applies all defined rules to the actual output:
1. It validates the output against the `AssertionRule.type` and `AssertionRule.expectedValue`.
2. It generates an `AssertionResult` containing a `pass` or `fail` status, along with an explanation.
3. If it passes, the rule's `weight` is added to the case's total score.
4. The final score is normalized to a percentage (0-100%).

## Regression Detection

Regressions are automatically detected by comparing the new run to the previous completed run in the same suite.

1. **Status downgrade** — PASS → PARTIAL/FAIL, or PARTIAL → FAIL
2. **Score drop** — Score falls by 15+ points
3. **Evidence lost** — `evidenceMatched` goes from `true` to `false`
4. **Latency spike** — Latency rises by 50%+ and exceeds 1000ms
