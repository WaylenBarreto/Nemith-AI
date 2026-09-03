import { NextRequest } from 'next/server';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PROJECT_ROOT = process.cwd();

function safePath(userPath: string): string {
  const resolved = join(PROJECT_ROOT, userPath);
  const rel = relative(PROJECT_ROOT, resolved);
  if (rel.startsWith('..')) {
    throw new Error('Path traversal not allowed');
  }
  return resolved;
}

export async function POST(req: NextRequest) {
  try {
    const { action, path: userPath, content, command } = await req.json();

    switch (action) {
      case 'read': {
        const fullPath = safePath(userPath);
        const data = await readFile(fullPath, 'utf-8');
        return Response.json({ content: data });
      }

      case 'write': {
        const fullPath = safePath(userPath);
        await writeFile(fullPath, content, 'utf-8');
        return Response.json({ success: true, message: `Wrote ${content.length} chars to ${userPath}` });
      }

      case 'list': {
        const fullPath = safePath(userPath || '.');
        const entries = await readdir(fullPath, { withFileTypes: true });
        const items = entries.map((e) => ({
          name: e.name,
          type: e.isDirectory() ? 'dir' as const : 'file' as const,
        }));
        return Response.json({ items });
      }

      case 'exec': {
        if (!command) return Response.json({ error: 'No command provided' }, { status: 400 });
        // Block dangerous commands
        const blocked = ['rm -rf /', 'sudo', 'chmod 777', 'mkfs', 'dd if='];
        if (blocked.some((b) => command.toLowerCase().includes(b))) {
          return Response.json({ error: 'Command blocked for safety' }, { status: 403 });
        }
        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd: PROJECT_ROOT,
            timeout: 30000,
            maxBuffer: 1024 * 1024,
          });
          return Response.json({ stdout: stdout.slice(0, 10000), stderr: stderr.slice(0, 5000), exitCode: 0 });
        } catch (err: any) {
          return Response.json({
            stdout: err.stdout?.slice(0, 10000) || '',
            stderr: err.stderr?.slice(0, 5000) || err.message,
            exitCode: err.code || 1,
          });
        }
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
