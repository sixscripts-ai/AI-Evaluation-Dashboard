# Provider Comparison Reports

EvalBench includes a Provider Comparison tool that allows users to evaluate multiple models side-by-side on the same evaluation suite.

## How it Works

1. Run multiple evaluations for the same suite (e.g. one run on Gemini, one on Groq, one on OpenRouter).
2. Click **Compare Runs** on the Suite Detail page.
3. Select 2 to 4 completed runs.
4. The dashboard computes and renders comparison summaries, flags, and a case-by-case comparison matrix.

## What is Compared

- **Accuracy Metrics**: Average score, pass count, partial count, and fail count.
- **Performance & Costs**: Average latency (ms), total tokens, and estimated cost (USD).

## Disagreement Detection

The comparison engine automatically scans test cases to flag differences between the selected runs:
- **Status Disagreement**: (High severity) One model passed a case while another completely failed.
- **Score Gap**: (Medium severity) A score gap of ≥ 25% exists between models on the same case.
- **Evidence Mismatch**: (High severity) One model matched all required evidence citations while another failed.
- **Latency Spread**: (Low severity) The slowest model was ≥ 2x slower than the fastest, with at least a 500ms difference.
- **Provider Error**: (High severity) A model failed at runtime while other models completed successfully.

## Winner & Diagnostics Panel

The report highlights:
- **Best Scoring**: Model with the highest average score.
- **Fastest**: Model with the lowest average response latency.
- **Most Reliable**: Model with the lowest failed cases and error rate.
- **Most Consistent**: Model with the lowest variance in scores.
- **Cases Needing Review**: Cases flagged with Medium or High severity disagreements.

## Exporting Reports

Reports can be exported as formatted Markdown or structured JSON data for integration into other systems.
