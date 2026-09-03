import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const API_BASE = 'https://api.github.com';

async function githubFetch(path: string) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Nemith-Agent',
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const res = await fetch(`${API_BASE}${path}`, { headers, next: { revalidate: 60 } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`GitHub API ${res.status}: ${body.message || res.statusText}`);
  }
  return res.json();
}

// --- List user's repos ---
export const githubListReposTool = tool(
  async ({ owner }) => {
    try {
      const endpoint = owner
        ? `/users/${owner}/repos?sort=updated&per_page=10`
        : '/user/repos?sort=updated&per_page=10';
      const repos = await githubFetch(endpoint);
      if (!repos.length) return 'No repositories found.';
      return repos
        .map(
          (r: any) =>
            `**${r.full_name}** — ${r.description || 'No description'}\n` +
            `  ${r.language || 'N/A'} | ${r.stargazers_count} stars | Updated: ${r.updated_at?.slice(0, 10)}`
        )
        .join('\n\n');
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  },
  {
    name: 'github_list_repos',
    description:
      'List GitHub repositories. Leave owner empty to list your own repos, or provide a username to list theirs.',
    schema: z.object({
      owner: z.string().optional().describe('GitHub username. Empty = your own repos.'),
    }),
  }
);

// --- Browse file tree ---
export const githubBrowseTool = tool(
  async ({ repo, path, branch }) => {
    try {
      const ref = branch || 'main';
      const dirPath = path || '';
      const endpoint = `/repos/${repo}/contents/${dirPath}?ref=${ref}`;
      const items = await githubFetch(endpoint);
      if (!Array.isArray(items)) return 'Path is a file, not a directory. Use github_read_file instead.';

      const dirs = items.filter((i: any) => i.type === 'dir').map((i: any) => `[DIR] ${i.name}/`);
      const files = items.filter((i: any) => i.type === 'file').map((i: any) => `[FILE] ${i.name} (${formatSize(i.size)})`);

      const result = [...dirs, ...files].join('\n');
      return result || 'Empty directory.';
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  },
  {
    name: 'github_browse',
    description: 'Browse the file/directory tree of a GitHub repository.',
    schema: z.object({
      repo: z.string().describe('Repository in "owner/repo" format (e.g. "facebook/react")'),
      path: z.string().optional().describe('Directory path (empty = root)'),
      branch: z.string().optional().describe('Branch name (default: main)'),
    }),
  }
);

// --- Read file content ---
export const githubReadFileTool = tool(
  async ({ repo, path, branch }) => {
    try {
      const ref = branch || 'main';
      const endpoint = `/repos/${repo}/contents/${path}?ref=${ref}`;
      const file = await githubFetch(endpoint);

      if (file.encoding === 'base64' && file.content) {
        const decoded = Buffer.from(file.content, 'base64').toString('utf-8');
        // Truncate very large files
        if (decoded.length > 15000) {
          return decoded.slice(0, 15000) + `\n\n... [truncated, ${decoded.length} chars total]`;
        }
        return decoded;
      }
      return `File: ${file.name} (${formatSize(file.size)}). Cannot decode content (encoding: ${file.encoding}).`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  },
  {
    name: 'github_read_file',
    description: 'Read the contents of a file from a GitHub repository.',
    schema: z.object({
      repo: z.string().describe('Repository in "owner/repo" format'),
      path: z.string().describe('File path (e.g. "src/index.ts")'),
      branch: z.string().optional().describe('Branch name (default: main)'),
    }),
  }
);

// --- Search code in a repo ---
export const githubSearchCodeTool = tool(
  async ({ repo, query }) => {
    try {
      const encoded = encodeURIComponent(`${query} repo:${repo}`);
      const data = await githubFetch(`/search/code?q=${encoded}&per_page=5`);
      if (!data.items?.length) return 'No results found.';
      return data.items
        .map(
          (item: any) =>
            `**${item.path}**\n  ${item.repository.full_name} — Score: ${item.score.toFixed(1)}`
        )
        .join('\n\n');
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  },
  {
    name: 'github_search_code',
    description: 'Search for code within a specific GitHub repository.',
    schema: z.object({
      repo: z.string().describe('Repository in "owner/repo" format'),
      query: z.string().describe('Search query (e.g. "useState", "handleAuth")'),
    }),
  }
);

// --- Read README ---
export const githubReadmeTool = tool(
  async ({ repo }) => {
    try {
      const readme = await githubFetch(`/repos/${repo}/readme`);
      if (readme.encoding === 'base64' && readme.content) {
        const decoded = Buffer.from(readme.content, 'base64').toString('utf-8');
        return decoded.length > 10000 ? decoded.slice(0, 10000) + '\n\n... [truncated]' : decoded;
      }
      return 'Could not decode README.';
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  },
  {
    name: 'github_readme',
    description: 'Read the README file of a GitHub repository.',
    schema: z.object({
      repo: z.string().describe('Repository in "owner/repo" format'),
    }),
  }
);

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * All GitHub tools for export.
 */
export const githubTools = [
  githubListReposTool,
  githubBrowseTool,
  githubReadFileTool,
  githubSearchCodeTool,
  githubReadmeTool,
];
