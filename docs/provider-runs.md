# Provider Runs

EvalBench supports running test cases against real LLM APIs (Gemini, Groq, OpenRouter) or running in a deterministic "simulated mode" fallback.

## Real Provider Runs

Real provider runs send the input prompts, target outputs, and evidence contexts to external models, capture the generated output, and score it using the assertion engine.

### Providers Supported
1. **Gemini**: Recommended `gemini-2.5-flash`. Requires `GEMINI_API_KEY`.
2. **Groq**: Fast inference. Recommended `llama-3.1-8b-instant`. Requires `GROQ_API_KEY`.
3. **OpenRouter**: OpenAI-compatible proxy to hundreds of models. Recommended `openai/gpt-oss-20b:free`. Requires `OPENROUTER_API_KEY`.

### Security
API keys are never sent to the browser. They are read from the server environment (`process.env.*`).

### Execution Flow
1. User triggers a run from the UI, selecting the provider and model.
2. The Express server iterates over active cases.
3. For each case, it builds a prompt including the input, target output guidelines, and required evidence.
4. It calls the provider API.
5. The response is captured, along with token usage and millisecond latency.
6. The assertion engine scores the actual response against the case's custom assertion rules.
7. The result is saved to the JSON store.

### Limitations
- **Timeout**: Each provider call has a strict 30-second timeout.
- **Concurrency**: Real runs are capped at 10 active test cases per request to prevent serverless execution limits.
- **Failures**: If a provider call fails or times out, the result is marked as failed with a `providerError`, and the run continues to the next case.

## Simulated Mode

Simulated mode is a deterministic fallback that generates mock responses locally. 
- It requires no API keys.
- It is instantaneous.
- It applies the same assertion engine as real runs.
- It is useful for testing the UI, CI environments, and local development.
