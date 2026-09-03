/**
 * Chat client — sends messages to the agent API and parses the streaming response.
 */

export interface ChatEvent {
  type: 'status' | 'text' | 'tool_call' | 'tool_result' | 'error' | 'done';
  content?: string;
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
  toolCallId?: string;
}

export interface SendMessageOptions {
  message: string;
  conversationHistory?: { role: string; content: string }[];
  mode?: string;
  projectId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onEvent: (event: ChatEvent) => void;
}

/**
 * Send a message to the agent and stream events back.
 * Throws on errors so the caller can display them.
 */
export async function sendMessage({
  message,
  conversationHistory,
  mode,
  projectId,
  onEvent,
}: SendMessageOptions): Promise<void> {
  // Read settings from localStorage
  let settings: Record<string, unknown> = {};
  try {
    const stored = localStorage.getItem('nemith_settings');
    if (stored) settings = JSON.parse(stored);
  } catch {}

  const finalModel = (settings.model as string) || undefined;
  const finalTemp = (settings.temperature as number) || undefined;
  const finalMaxTokens = (settings.maxTokens as number) || undefined;
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationHistory, mode, projectId, model: finalModel, temperature: finalTemp, maxTokens: finalMaxTokens }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let hasError = false;
  let errorContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') {
        onEvent({ type: 'done' });
        return;
      }

      try {
        const event: ChatEvent = JSON.parse(data);

        // Track errors — show them to the user
        if (event.type === 'error') {
          hasError = true;
          errorContent = event.content || 'Unknown error';
        }

        onEvent(event);
      } catch {
        // Skip malformed JSON
      }
    }
  }

  // If we got error events but no text response, throw so the UI shows it
  if (hasError && !errorContent.includes('[DONE]')) {
    throw new Error(errorContent);
  }

  onEvent({ type: 'done' });
}
