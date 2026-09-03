import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM, resetCallCount } from './llm';
import { getAllTools } from './tools';

const SYSTEM_PROMPT = `You are Nemith, an AI developer assistant and autonomous agent.

You help users with:
- Writing, reading, and understanding code (you have real filesystem access)
- Researching topics using web search
- Managing projects, tasks, and documents
- Answering questions about uploaded documents (PDFs, docs, etc.)
- Browsing and reading GitHub repositories
- Executing shell commands for build, test, and dev workflows
- Answering technical questions with depth

IMPORTANT: Only use tools when the user's request genuinely requires real-time data, file access, document search, or code execution. For simple greetings, questions, explanations, and conversation, respond directly WITHOUT using any tools. Do not use tools unnecessarily.

Filesystem: You have direct read/write access to the project files. Use read_file, write_file, and list_directory to work with real code. Use run_terminal for shell commands (npm, git, etc.).

Document Q&A: When a user asks about their documents, files, or uploaded content, use search_documents to find relevant information. Use list_documents first to see what's available.

GitHub: When a user mentions a repo or wants to explore code, use github_* tools to browse, read files, and search code.

Guidelines:
- Be concise and direct. No filler.
- Only use tools when you need real-time data, file access, or document search.
- When writing code, follow best practices and explain your reasoning.
- If you're unsure, say so rather than guessing.
- Format code with markdown code blocks with language tags.
- For multi-step tasks, break them into clear steps and execute them.`;

export interface AgentConfig {
  mode?: 'chat' | 'research' | 'project' | 'knowledge';
  projectId?: string;
  conversationHistory?: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Detect if a message is purely conversational and doesn't need tools.
 * This saves 1+ LLM calls per simple message by skipping tool binding.
 */
function isConversational(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  // Very short messages that are clearly conversational
  if (trimmed.length < 50) {
    const conversationalPatterns = [
      /^(hi|hey|hello|yo|sup|wassup|bye|thanks|thank you|ok|okay|sure|yes|no|cool|nice|good|great|lol|haha|help|what|how|who|why|when|where)$/i,
      /^(hola|salut|ciao|namaste|bonjour|gracias|por favor)/i,
      /^(good morning|good evening|good afternoon|good night)/i,
      /^(how are you|what's up|what are you|who are you)/i,
      /^(tell me|explain|what is|what does|can you|could you|would you)/i,
      /^(thank|thanks|thx|ty|np|no problem|you're welcome)/i,
    ];
    return conversationalPatterns.some((p) => p.test(trimmed));
  }
  return false;
}

/**
 * Run the agent on a user message. Returns a streaming response.
 */
export async function* runAgent(
  userMessage: string,
  config: AgentConfig = {}
) {
  resetCallCount();
  const startTime = Date.now();
  const useTools = !isConversational(userMessage);

  console.log(`[Agent] Processing message: "${userMessage.slice(0, 80)}${userMessage.length > 80 ? '...' : ''}" — tools: ${useTools ? 'enabled' : 'SKIPPED (conversational)'}`);

  const llm = createLLM({
    model: config.model,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 4000,
  });

  const tools = getAllTools();
  const llmWithTools = useTools ? llm.bindTools(tools) : llm;
  const TIMEOUT_MS = 30000; // 30s per LLM call

  function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s. The model may be slow — try again or switch to a faster model in Settings.`)), ms)
      ),
    ]);
  }

  // Build message history — CLEAN: only user and assistant messages, no tool messages
  const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
    new SystemMessage(SYSTEM_PROMPT),
  ];

  if (config.conversationHistory) {
    const recentHistory = config.conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      // Skip tool messages and empty messages to save tokens
      if (msg.role === 'tool' || !msg.content.trim()) continue;
      if (msg.role === 'user') {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        messages.push(new AIMessage(msg.content));
      }
    }
  }

  // Add current message
  messages.push(new HumanMessage(userMessage));

  // For conversational messages, respond directly without tools
  if (!useTools) {
    console.log(`[Agent] Conversational path — calling LLM once without tools`);
    yield { type: 'status', content: 'Thinking...' };

    const response = await withTimeout(
      llm.invoke(messages) as Promise<AIMessage>,
      TIMEOUT_MS,
      'LLM call'
    );

    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    console.log(`[Agent] Conversational response in ${Date.now() - startTime}ms — 1 LLM call`);
    yield { type: 'text', content };
    yield { type: 'done' };
    return;
  }

  // Agent loop: call LLM with tools, execute tools, repeat until final answer
  let iterations = 0;
  const MAX_ITERATIONS = 3; // Reduced from 5 to limit LLM calls

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`[Agent] Tool loop iteration ${iterations}/${MAX_ITERATIONS}`);

    yield { type: 'status', content: 'Thinking...' };

    const response = await withTimeout(
      llmWithTools.invoke(messages),
      TIMEOUT_MS,
      'LLM call'
    );

    // If the model made tool calls, execute them
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`[Agent] Model requested ${response.tool_calls.length} tool call(s): ${response.tool_calls.map((tc: any) => tc.name).join(', ')}`);

      // Yield tool call info
      for (const tc of response.tool_calls) {
        yield {
          type: 'tool_call',
          id: tc.id || `call_${iterations}_${tc.name}`,
          name: tc.name,
          args: tc.args,
        };
      }

      // Add the AI response with tool calls to messages
      messages.push(response);

      // Execute each tool and add results
      const toolMap = new Map<string, typeof tools[number]>(tools.map((t) => [t.name, t]));

      for (const tc of response.tool_calls) {
        const toolInstance = toolMap.get(tc.name as string);
        if (toolInstance) {
          yield { type: 'status', content: `Running ${tc.name}...` };
          try {
            const startTime = Date.now();
            const result = await withTimeout(
              (toolInstance as any).invoke(tc.args),
              15000,
              `Tool ${tc.name}`
            );
            const durationMs = Date.now() - startTime;
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

            console.log(`[Agent] Tool ${tc.name} completed in ${durationMs}ms`);

            yield {
              type: 'tool_result',
              toolCallId: tc.id || `call_${iterations}_${tc.name}`,
              name: tc.name,
              content: resultStr,
            };

            messages.push({
              role: 'tool' as const,
              content: resultStr,
              tool_call_id: tc.id || `call_${iterations}_${tc.name}`,
            } as any);
          } catch (error) {
            const errMsg = `Tool error: ${error instanceof Error ? error.message : 'unknown'}`;
            console.error(`[Agent] Tool ${tc.name} failed:`, errMsg);
            yield { type: 'tool_result', toolCallId: tc.id, name: tc.name, content: errMsg };
            messages.push({
              role: 'tool' as const,
              content: errMsg,
              tool_call_id: tc.id,
            } as any);
          }
        }
      }
    } else {
      // No tool calls — this is the final response
      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

      console.log(`[Agent] Final response after ${iterations} iteration(s), ${Date.now() - startTime}ms total`);
      yield { type: 'text', content };
      yield { type: 'done' };
      return;
    }
  }

  // Safety: if we hit max iterations
  console.log(`[Agent] Hit max iterations (${MAX_ITERATIONS})`);
  yield { type: 'text', content: 'I reached the maximum number of steps. Let me know if you need me to continue.' };
  yield { type: 'done' };
}
