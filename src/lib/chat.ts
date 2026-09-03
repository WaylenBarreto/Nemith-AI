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
  onEvent: (event: ChatEvent) => void;
}

/**
 * Send a message to the agent and stream events back.
 */
export async function sendMessage({
  message,
  conversationHistory,
  mode,
  projectId,
  onEvent,
}: SendMessageOptions): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationHistory, mode, projectId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    onEvent({ type: 'error', content: error.error || `HTTP ${res.status}` });
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onEvent({ type: 'error', content: 'No response body' });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

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
        onEvent(event);
      } catch {
        // Skip malformed JSON
      }
    }
  }

  onEvent({ type: 'done' });
}
