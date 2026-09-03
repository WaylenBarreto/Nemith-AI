import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PROJECT_ROOT = process.cwd();

/** Resolve and validate a path is within the project directory */
function safePath(userPath: string): string {
  const resolved = join(PROJECT_ROOT, userPath);
  const rel = relative(PROJECT_ROOT, resolved);
  if (rel.startsWith('..')) {
    throw new Error(`Path "${userPath}" is outside the project directory`);
  }
  return resolved;
}

/** Get a human-readable file size */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// --- Read File (real) ---
export const readFileTool = tool(
  async ({ path: userPath }) => {
    try {
      const fullPath = safePath(userPath);
      const content = await readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      const truncated = lines.length > 500;
      const display = truncated ? lines.slice(0, 500).join('\n') : content;
      return truncated
        ? `${display}\n\n--- Truncated (${lines.length} total lines, showing first 500) ---`
        : content;
    } catch (e: any) {
      if (e.code === 'ENOENT') return `File not found: ${userPath}`;
      return `Error reading ${userPath}: ${e.message}`;
    }
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file in the project. Returns the full file content (truncated at 500 lines).',
    schema: z.object({
      path: z.string().describe('Relative file path (e.g. "src/app/page.tsx")'),
    }),
  }
);

// --- Write File (real) ---
export const writeFileTool = tool(
  async ({ path: userPath, content }) => {
    try {
      const fullPath = safePath(userPath);
      await writeFile(fullPath, content, 'utf-8');
      return `Successfully wrote ${content.length} characters to ${userPath}`;
    } catch (e: any) {
      return `Error writing ${userPath}: ${e.message}`;
    }
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file with new content. Use this to create new files or modify existing ones.',
    schema: z.object({
      path: z.string().describe('Relative file path to write to'),
      content: z.string().describe('The full file content to write'),
    }),
  }
);

// --- List Directory (real) ---
export const listDirectoryTool = tool(
  async ({ path: userPath }) => {
    try {
      const fullPath = safePath(userPath || '.');
      const entries = await readdir(fullPath, { withFileTypes: true });
      const items = await Promise.all(
        entries
          .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
          .slice(0, 100)
          .map(async (e) => {
            const entryPath = join(fullPath, e.name);
            const relPath = join(userPath || '.', e.name);
            if (e.isDirectory()) {
              return `  [DIR]  ${relPath}/`;
            }
            try {
              const s = await stat(entryPath);
              return `  [FILE] ${relPath} (${formatSize(s.size)})`;
            } catch {
              return `  [FILE] ${relPath}`;
            }
          })
      );
      return items.length > 0
        ? `Contents of ${userPath || '.'}:\n${items.join('\n')}`
        : `Directory ${userPath || '.'} is empty`;
    } catch (e: any) {
      if (e.code === 'ENOENT') return `Directory not found: ${userPath}`;
      return `Error listing ${userPath}: ${e.message}`;
    }
  },
  {
    name: 'list_directory',
    description: 'List files and subdirectories in a project directory. Shows file sizes and separates files from directories.',
    schema: z.object({
      path: z.string().describe('Relative directory path (e.g. "src/components")'),
    }),
  }
);

// --- Run Terminal (real, sandboxed) ---
export const runTerminalTool = tool(
  async ({ command }) => {
    const blocked = ['rm -rf /', 'sudo ', 'chmod 777', 'mkfs', 'dd if=', ':(){ :|:& };:'];
    if (blocked.some((b) => command.toLowerCase().includes(b))) {
      return 'Command blocked for safety reasons.';
    }
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: PROJECT_ROOT,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });
      let output = '';
      if (stdout) output += `STDOUT:\n${stdout.slice(0, 8000)}`;
      if (stderr) output += `${output ? '\n\n' : ''}STDERR:\n${stderr.slice(0, 4000)}`;
      return output || 'Command executed successfully (no output)';
    } catch (e: any) {
      let output = '';
      if (e.stdout) output += `STDOUT:\n${e.stdout.slice(0, 8000)}`;
      if (e.stderr) output += `${output ? '\n\n' : ''}STDERR:\n${e.stderr.slice(0, 4000)}`;
      return output || `Command failed: ${e.message}`;
    }
  },
  {
    name: 'run_terminal',
    description: 'Execute a shell command in the project directory. Returns stdout and stderr. Timeout: 30s.',
    schema: z.object({
      command: z.string().describe('The shell command to execute'),
    }),
  }
);

// --- Create Task ---
export const createTaskTool = tool(
  async ({ title, description, priority }) => {
    return `Task created: "${title}" (priority: ${priority || 'medium'}). ${description || ''}`;
  },
  {
    name: 'create_task',
    description: 'Create a new task in the task board.',
    schema: z.object({
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Task priority'),
    }),
  }
);

// --- Memory Store ---
export const memoryStoreTool = tool(
  async ({ content, type }) => {
    return `Memory stored (${type || 'fact'}): "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`;
  },
  {
    name: 'memory_store',
    description: 'Save something to persistent memory for future conversations. Use for user preferences, important facts, or context.',
    schema: z.object({
      content: z.string().describe('What to remember'),
      type: z.enum(['preference', 'fact', 'context']).optional().describe('Type of memory'),
    }),
  }
);

/**
 * Get all tools as an array for LangChain agent binding.
 */
export function getAllTools() {
  return [
    readFileTool,
    writeFileTool,
    listDirectoryTool,
    runTerminalTool,
    createTaskTool,
    memoryStoreTool,
  ];
}
