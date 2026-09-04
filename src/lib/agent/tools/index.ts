import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { githubTools } from './github';
import { documentTools } from './documents';
import { getAllTools as getBaseTools } from './base';

// Re-export base tools
export { readFileTool, writeFileTool, listDirectoryTool, runTerminalTool, createTaskTool, memoryStoreTool } from './base';

// --- Backend: Serper (requires API key, returns Google results) ---
async function searchSerper(query: string, apiKey: string, num: number = 5): Promise<string | null> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const results = (data.organic || []).slice(0, num).map((r: any) =>
    `**${r.title || 'Untitled'}**\n${r.link || ''}\n${r.snippet || ''}`
  );
  return results.length > 0 ? results.join('\n\n') : null;
}

// --- Backend: GitHub Search (free, no API key, 10 requests/min) ---
async function searchGitHub(query: string, num: number = 5): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=${num}`,
      {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    const results = data.items.slice(0, num).map((r: any) =>
      `**${r.full_name}** ⭐ ${r.stargazers_count}\n${r.html_url}\n${r.description || 'No description'}\nLanguage: ${r.language || 'N/A'}`
    );
    return `Found ${data.total_count} repos:\n\n${results.join('\n\n')}`;
  } catch {
    return null;
  }
}

// --- Backend: Wikipedia API (free, no key) ---
async function searchWikipedia(query: string): Promise<string | null> {
  try {
    // Search for relevant pages
    const searchRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.extract) {
        return `**${data.title}** (Wikipedia)\n${data.content_urls?.desktop?.page || ''}\n\n${data.extract}`;
      }
    }

    // Fallback: use Wikipedia search API
    const listRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&origin=*`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!listRes.ok) return null;

    const listData = await listRes.json();
    const results = (listData.query?.search || []).slice(0, 5).map((r: any) =>
      `**${r.title}**\nhttps://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}\n${r.snippet.replace(/<[^>]*>/g, '')}`
    );
    return results.length > 0 ? results.join('\n\n') : null;
  } catch {
    return null;
  }
}

// --- Backend: DuckDuckGo HTML (may be blocked, best effort) ---
async function searchDuckDuckGo(query: string, num: number = 5): Promise<string | null> {
  try {
    const params = new URLSearchParams({ q: query, kl: 'us-en' });
    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Bot detection check
    if (html.includes('botnet') || html.includes('anomaly.js') || html.length < 5000) return null;

    const titleRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    const titles: { url: string; title: string }[] = [];
    const snippets: string[] = [];
    let match;

    while ((match = titleRegex.exec(html)) !== null) {
      let url = match[1];
      const uddg = url.match(/uddg=([^&]+)/);
      if (uddg) url = decodeURIComponent(uddg[1]);
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      if (title && url) titles.push({ url, title });
    }

    while ((match = snippetRegex.exec(html)) !== null) {
      const snippet = match[1].replace(/<[^>]*>/g, '').trim();
      if (snippet) snippets.push(snippet);
    }

    if (titles.length === 0) return null;

    return titles.slice(0, num).map((t, i) =>
      `**${t.title}**\n${t.url}\n${snippets[i] || ''}`
    ).join('\n\n');
  } catch {
    return null;
  }
}

/**
 * Detect if a query is about code, repos, or technical projects — route to GitHub first.
 */
function isCodeRelated(query: string): boolean {
  const q = query.toLowerCase();
  return /\b(github|repo|repository|code|library|framework|npm|package|open.?source|stars?|forks?|project|tool|app|platform|workspace)\b/.test(q);
}

/**
 * Detect if a query is about a known topic/concept — route to Wikipedia first.
 */
function isTopicQuery(query: string): boolean {
  const q = query.toLowerCase();
  return /\b(what is|who is|explain|history of|definition|meaning|overview|about)\b/.test(q) && q.length < 80;
}

// --- Web Search Tool with multi-backend fallback ---
export const webSearchTool = tool(
  async ({ query }) => {
    const serperKey = process.env.SERPER_API_KEY;
    const hasValidSerper = serperKey && serperKey !== 'your_serper_key_here' && serperKey.length > 10;

    console.log(`[WebSearch] Query: "${query}"`);

    // Strategy 1: Serper (best results if key works)
    if (hasValidSerper) {
      try {
        const result = await searchSerper(query, serperKey);
        if (result) {
          console.log(`[WebSearch] ✓ Serper returned ${result.length} chars`);
          return result;
        }
      } catch (e) {
        console.warn(`[WebSearch] Serper failed: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    // Strategy 2: Smart routing based on query type
    if (isCodeRelated(query)) {
      // Try GitHub first for code-related queries
      try {
        const result = await searchGitHub(query);
        if (result) {
          console.log(`[WebSearch] ✓ GitHub returned ${result.length} chars`);
          return result;
        }
      } catch (e) {
        console.warn(`[WebSearch] GitHub failed: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    if (isTopicQuery(query)) {
      // Try Wikipedia for topic/concept queries
      try {
        const result = await searchWikipedia(query);
        if (result) {
          console.log(`[WebSearch] ✓ Wikipedia returned ${result.length} chars`);
          return result;
        }
      } catch (e) {
        console.warn(`[WebSearch] Wikipedia failed: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    // Strategy 3: Try remaining backends in order
    const backends: Array<{ name: string; fn: () => Promise<string | null> }> = [];

    if (!isCodeRelated(query)) {
      backends.push({ name: 'GitHub', fn: () => searchGitHub(query) });
    }
    if (!isTopicQuery(query)) {
      backends.push({ name: 'Wikipedia', fn: () => searchWikipedia(query) });
    }
    backends.push({ name: 'DuckDuckGo', fn: () => searchDuckDuckGo(query) });

    for (const backend of backends) {
      try {
        const result = await backend.fn();
        if (result) {
          console.log(`[WebSearch] ✓ ${backend.name} returned ${result.length} chars`);
          return result;
        }
      } catch (e) {
        console.warn(`[WebSearch] ${backend.name} failed: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    // All backends failed
    console.error(`[WebSearch] ✗ All backends failed for: "${query}"`);
    return 'Search is currently unavailable. The search backends (Serper, GitHub, Wikipedia, DuckDuckGo) all failed. This may be due to rate limits or network issues. Try again in a moment.';
  },
  {
    name: 'web_search',
    description: 'Search the internet for current information. Use for research, facts, news, and real-time data. Automatically routes code/repo queries to GitHub Search and topic queries to Wikipedia. Falls back through multiple free backends — no API key required.',
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
