import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { githubTools } from './github';
import { documentTools } from './documents';
import { getAllTools as getBaseTools } from './base';

// Re-export base tools
export { readFileTool, writeFileTool, listDirectoryTool, runTerminalTool, createTaskTool, memoryStoreTool } from './base';

// --- Web Search ---
export const webSearchTool = tool(
  async ({ query }) => {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return 'Web search is not configured. Set SERPER_API_KEY in .env.local';

    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 5 }),
      });
      const data = await res.json();
      const results = (data.organic || []).slice(0, 5).map((r: any) =>
        `**${r.title}**\n${r.link}\n${r.snippet}`
      );
      return results.length ? results.join('\n\n') : 'No results found.';
    } catch (e) {
      return `Search failed: ${e instanceof Error ? e.message : 'unknown error'}`;
    }
  },
  {
    name: 'web_search',
    description: 'Search the internet for current information. Use for research, facts, news, and real-time data.',
    schema: z.object({
      query: z.string().describe('The search query'),
    }),
  }
);

/**
 * Get all tools as an array for LangChain agent binding.
 */
export function getAllTools() {
  return [
    webSearchTool,
    ...getBaseTools(),
    ...githubTools,
    ...documentTools,
  ];
}
