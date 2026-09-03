import { ChatOpenAI } from '@langchain/openai';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';

let llmCallCount = 0;

/**
 * Create a ChatOpenAI instance configured for OpenRouter.
 * maxRetries is set to 0 to prevent automatic retries on 429/5xx,
 * which would triple the request count against OpenRouter's free-tier limit.
 */
export function createLLM(options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to .env.local\n' +
      'Get your key at https://openrouter.ai/keys'
    );
  }

  const modelName = options?.model || OPENROUTER_MODEL;
  llmCallCount++;
  console.log(`[LLM] Call #${llmCallCount} — model: ${modelName}, temp: ${options?.temperature ?? 0.7}, maxTokens: ${options?.maxTokens ?? 4000}`);

  return new ChatOpenAI({
    apiKey: OPENROUTER_API_KEY,
    modelName,
    temperature: options?.temperature ?? 0.7,
    maxTokens: options?.maxTokens ?? 4000,
    maxRetries: 0, // CRITICAL: prevent automatic retries on 429 rate limits
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_APP_NAME || 'Nemith',
      },
    },
  });
}

/**
 * Reset the call counter (for diagnostics).
 */
export function resetCallCount() {
  llmCallCount = 0;
}

/**
 * Get the current LLM call count.
 */
export function getCallCount() {
  return llmCallCount;
}

/**
 * Get the current model name for display purposes.
 */
export function getModelName(): string {
  return OPENROUTER_MODEL;
}
