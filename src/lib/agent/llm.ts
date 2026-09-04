import { ChatOpenAI } from '@langchain/openai';

// ============================================================
// LLM Provider — OpenRouter (primary) + Gemini (fallback)
// ============================================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

let llmCallCount = 0;
let activeProvider: 'openrouter' | 'gemini' = 'openrouter';

/**
 * Detect if an error is a rate-limit or provider error.
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
  }
  return false;
}

/**
 * Get the currently active provider.
 */
export function getActiveProvider(): 'openrouter' | 'gemini' {
  return activeProvider;
}

/**
 * Switch to the fallback (Gemini) provider.
 */
export function switchToFallback(): void {
  console.log(`[LLM] ⚡ Switching from OpenRouter → Gemini fallback`);
  activeProvider = 'gemini';
}

/**
 * Create a ChatOpenAI instance configured for OpenRouter.
 */
export function createLLM(options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const provider = activeProvider;

  if (provider === 'gemini') {
    return createFallbackLLM(options);
  }

  if (!OPENROUTER_API_KEY) {
    console.log('[LLM] No OPENROUTER_API_KEY — falling back to Gemini');
    activeProvider = 'gemini';
    return createFallbackLLM(options);
  }

  const modelName = options?.model || OPENROUTER_MODEL;
  llmCallCount++;
  console.log(`[LLM] Call #${llmCallCount} — provider: openrouter, model: ${modelName}, temp: ${options?.temperature ?? 0.7}, maxTokens: ${options?.maxTokens ?? 4000}`);

  return new ChatOpenAI({
    apiKey: OPENROUTER_API_KEY,
    modelName,
    temperature: options?.temperature ?? 0.7,
    maxTokens: options?.maxTokens ?? 4000,
    maxRetries: 0,
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
 * Create a Gemini LLM via its OpenAI-compatible endpoint.
 */
export function createFallbackLLM(options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to .env.local\n' +
      'Get your key at https://aistudio.google.com/apikey'
    );
  }

  const modelName = options?.model || GEMINI_MODEL;
  llmCallCount++;
  console.log(`[LLM] Call #${llmCallCount} — provider: gemini (fallback), model: ${modelName}, temp: ${options?.temperature ?? 0.7}, maxTokens: ${options?.maxTokens ?? 4000}`);

  return new ChatOpenAI({
    apiKey: GEMINI_API_KEY,
    modelName,
    temperature: options?.temperature ?? 0.7,
    maxTokens: options?.maxTokens ?? 4000,
    maxRetries: 0,
    configuration: {
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    },
  });
}

/**
 * Invoke an LLM with automatic fallback on 429 rate limits.
 */
export async function invokeWithFallback(
  llm: { invoke: (msgs: any[]) => Promise<any> },
  messages: any[],
  timeoutMs: number = 30000,
  label: string = 'LLM call',
): Promise<any> {
  const withTimeout = <T>(promise: Promise<T>, ms: number, lbl: string): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${lbl} timed out after ${ms / 1000}s`)), ms)
      ),
    ]);

  try {
    return await withTimeout(llm.invoke(messages) as Promise<any>, timeoutMs, label);
  } catch (error) {
    if (isRateLimitError(error) && getActiveProvider() === 'openrouter') {
      console.log(`[LLM] ⚡ Rate limited on OpenRouter — switching to Gemini fallback`);
      switchToFallback();
      const fallbackLLM = createFallbackLLM();
      return await withTimeout(
        fallbackLLM.invoke(messages) as Promise<any>,
        timeoutMs,
        `${label} (fallback)`,
      );
    }
    throw error;
  }
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
  if (activeProvider === 'gemini') return GEMINI_MODEL;
  return OPENROUTER_MODEL;
}
