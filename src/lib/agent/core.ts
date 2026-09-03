import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from './llm';
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

Filesystem: You have direct read/write access to the project files. Use read_file, write_file, and list_directory to work with real code. Use run_terminal for shell commands (npm, git, etc.).

Document Q&A: When a user asks about their documents, files, or uploaded content, use search_documents to find relevant information. Use list_documents first to see what's available.

GitHub: When a user mentions a repo or wants to explore code, use github_* tools to browse, read files, and search code.

Guidelines:
- Be concise and direct. No filler.
- Use tools when you need real-time data, file access, or document search.
- When writing code, follow best practices and explain your reasoning.
- If you're unsure, say so rather than guessing.
- Format code with markdown code blocks with language tags.
- For multi-step tasks, break them into clear steps and execute them.`;

export interface AgentConfig {
  mode?: 'chat' | 'research' | 'project' | 'knowledge';
  projectId?: string;
  conversationHistory?: { role: string; content: string }[];
}

/**
 * Run the agent on a user message. Returns a streaming response.
 */
export async function* runAgent(
  userMessage: string,
  config: AgentConfig = {}
) {
  const llm = createLLM({ temperature: 0.7 });
  const tools = getAllTools();
  const llmWithTools = llm.bindTools(tools);

  // Build message history
  const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
    new SystemMessage(SYSTEM_PROMPT),
  ];

  // Add conversation history (last 20 messages for context window)
  if (config.conversationHistory) {
    const recentHistory = config.conversationHistory.slice(-20);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        messages.push(new AIMessage(msg.content));
      }
    }
  }

  // Add current message
  messages.push(new HumanMessage(userMessage));

  // Agent loop: call LLM, execute tools, repeat until final answer
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Yield thinking status
    yield { type: 'status', content: 'Thinking...' };

    const response = await llmWithTools.invoke(messages);

    // If the model made tool calls, execute them
    if (response.tool_calls && response.tool_calls.length > 0) {
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
            const result = await (toolInstance as any).invoke(tc.args);
            const durationMs = Date.now() - startTime;
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

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

      yield { type: 'text', content };
      yield { type: 'done' };
      return;
    }
  }

  // Safety: if we hit max iterations
  yield { type: 'text', content: 'I reached the maximum number of steps. Let me know if you need me to continue.' };
  yield { type: 'done' };
}
