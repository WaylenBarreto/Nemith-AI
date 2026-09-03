import { useAppStore } from '../store';

/**
 * Sync helpers — load data from Supabase and persist changes.
 * The Zustand store remains the source of truth for the UI;
 * these functions bridge it to the database.
 *
 * A local→remote ID map handles the race condition between
 * optimistic local IDs and the real Supabase UUIDs.
 */

// ============================================================
// ID resolution — map local IDs to Supabase IDs
// ============================================================

const idMap = new Map<string, string>();

/** Register a mapping from local ID to Supabase ID */
export function mapId(localId: string, dbId: string) {
  idMap.set(localId, dbId);
}

/** Resolve a local ID to its Supabase ID (falls back to the original) */
function resolveId(localId: string): string {
  return idMap.get(localId) || localId;
}

// ============================================================
// LOAD — hydrate the store from Supabase
// ============================================================

export async function loadAllFromDB() {
  try {
    const [convosRes, projectsRes, docsRes, tasksRes, memRes] = await Promise.allSettled([
      fetch('/api/conversations').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/documents').then((r) => r.json()),
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/memory').then((r) => r.json()),
    ]);

    const state: Record<string, unknown> = {};

    if (convosRes.status === 'fulfilled' && convosRes.value.conversations) {
      state.conversations = convosRes.value.conversations;
    }
    if (projectsRes.status === 'fulfilled' && projectsRes.value.projects) {
      state.projects = projectsRes.value.projects;
    }
    if (docsRes.status === 'fulfilled' && docsRes.value.documents) {
      state.documents = docsRes.value.documents;
    }
    if (tasksRes.status === 'fulfilled' && tasksRes.value.tasks) {
      state.tasks = tasksRes.value.tasks;
    }
    if (memRes.status === 'fulfilled' && memRes.value.memories) {
      state.memories = memRes.value.memories;
    }

    useAppStore.setState(state);
  } catch {
    // Silent fail — store stays empty, user can still work locally
  }
}

// ============================================================
// PERSIST — sync individual changes to Supabase
// ============================================================

export async function persistConversation(mode: string, projectId?: string, localId?: string) {
  try {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', mode, projectId, id: localId }),
    });
    const data = await res.json();
    return data.conversation;
  } catch {
    return null;
  }
}

export async function persistConversationTitle(id: string, title: string) {
  try {
    await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_title', id: resolveId(id), title }),
    });
  } catch {}
}

export async function persistDeleteConversation(id: string) {
  try {
    await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: resolveId(id) }),
    });
    idMap.delete(id);
  } catch {}
}

export async function persistMessage(conversationId: string, role: string, content: string, toolCalls?: unknown, sources?: unknown, localId?: string) {
  try {
    const resolvedId = resolveId(conversationId);
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_message', conversationId: resolvedId, role, content, toolCalls, sources, id: localId }),
    });
    const data = await res.json();
    return data.message;
  } catch {
    return null;
  }
}

export async function persistUpdateMessage(id: string, content: string, toolCalls?: unknown) {
  try {
    const resolvedId = resolveId(id);
    await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_message', id: resolvedId, content, toolCalls }),
    });
  } catch {}
}

export async function persistProject(name: string, description: string, githubRepo?: string) {
  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name, description, githubRepo }),
    });
    const data = await res.json();
    return data.project;
  } catch {
    return null;
  }
}

export async function persistUpdateProject(id: string, updates: { name?: string; description?: string; githubRepo?: string }) {
  try {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: resolveId(id), ...updates }),
    });
  } catch {}
}

export async function persistDeleteProject(id: string) {
  try {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: resolveId(id) }),
    });
    idMap.delete(id);
  } catch {}
}

export async function persistDocument(doc: { filename: string; fileType: string; fileSize: number; projectId?: string }) {
  try {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_db', ...doc }),
    });
    const data = await res.json();
    return data.document;
  } catch {
    return null;
  }
}

export async function persistUpdateDocument(id: string, updates: { status?: string; chunkCount?: number }) {
  try {
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: resolveId(id), ...updates }),
    });
  } catch {}
}

export async function persistDeleteDocument(id: string) {
  try {
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: resolveId(id) }),
    });
    idMap.delete(id);
  } catch {}
}

export async function persistTask(task: { title: string; description?: string; priority?: string; status?: string; projectId?: string }) {
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...task }),
    });
    const data = await res.json();
    return data.task;
  } catch {
    return null;
  }
}

export async function persistUpdateTask(id: string, updates: { title?: string; description?: string; priority?: string; status?: string }) {
  try {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: resolveId(id), ...updates }),
    });
  } catch {}
}

export async function persistDeleteTask(id: string) {
  try {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: resolveId(id) }),
    });
    idMap.delete(id);
  } catch {}
}

export async function persistMemory(content: string, type?: string, importance?: number) {
  try {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', content, type, importance }),
    });
    const data = await res.json();
    return data.memory;
  } catch {
    return null;
  }
}

export async function persistDeleteMemory(id: string) {
  try {
    await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: resolveId(id) }),
    });
    idMap.delete(id);
  } catch {}
}
