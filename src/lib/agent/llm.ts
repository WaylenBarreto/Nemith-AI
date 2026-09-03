import { ChatOpenAI } from '@langchain/openai';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';

/**
 * Create a ChatOpenAI instance configured for OpenRouter.
 * OpenRouter is OpenAI-compatible, so we point the base URL there.
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

  return new ChatOpenAI({
    apiKey: OPENROUTER_API_KEY,
    modelName: options?.model || OPENROUTER_MODEL,
    temperature: options?.temperature ?? 0.7,
    maxTokens: options?.maxTokens ?? 4000,
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
 * Get the current model name for display purposes.
 */
export function getModelName(): string {
  return OPENROUTER_MODEL;
}
