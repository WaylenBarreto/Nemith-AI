import { getSupabaseServer } from './server';
import type { Conversation, Message, Project, Document, Task, Memory } from '../types';

const supabase = () => getSupabaseServer();

// ============================================================
// CONVERSATIONS
// ============================================================

export async function dbGetConversations(): Promise<Conversation[]> {
  const { data: convos, error } = await supabase()
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Fetch messages for each conversation
  const conversations: Conversation[] = [];
  for (const c of convos || []) {
    const { data: msgs } = await supabase()
      .from('messages')
      .select('*')
      .eq('conversation_id', c.id)
      .order('created_at', { ascending: true });

    conversations.push({
      id: c.id,
      title: c.title,
      mode: c.mode,
      projectId: c.project_id,
      messages: (msgs || []).map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        role: m.role,
        content: m.content,
        toolCalls: m.tool_calls || undefined,
        sources: m.sources || undefined,
        createdAt: m.created_at,
      })),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    });
  }

  return conversations;
}

export async function dbCreateConversation(mode: string, projectId?: string, id?: string): Promise<Conversation> {
  const { data, error } = await supabase()
    .from('conversations')
    .insert({ id: id || undefined, title: 'New Conversation', mode, project_id: projectId })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    mode: data.mode,
    projectId: data.project_id,
    messages: [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function dbUpdateConversation(id: string, updates: { title?: string }) {
  const { error } = await supabase()
    .from('conversations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function dbDeleteConversation(id: string) {
  const { error } = await supabase()
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// MESSAGES
// ============================================================

export async function dbAddMessage(msg: {
  conversationId: string;
  role: string;
  content: string;
  toolCalls?: unknown;
  sources?: unknown;
  id?: string;
}): Promise<Message> {
  const insertMsg = async () => {
    return supabase()
      .from('messages')
      .insert({
        id: msg.id || undefined,
        conversation_id: msg.conversationId,
        role: msg.role,
        content: msg.content,
        tool_calls: msg.toolCalls || null,
        sources: msg.sources || null,
      })
      .select()
      .single();
  };

  let { data, error } = await insertMsg();

  // If FK constraint failed (conversation row hasn't arrived yet),
  // wait briefly and retry — the create is happening concurrently
  if (error && error.message.includes('foreign key')) {
    await new Promise((r) => setTimeout(r, 500));
    ({ data, error } = await insertMsg());
  }

  // Second retry as last resort
  if (error && error.message.includes('foreign key')) {
    await new Promise((r) => setTimeout(r, 1000));
    ({ data, error } = await insertMsg());
  }

  if (error) throw error;

  return {
    id: data.id,
    conversationId: data.conversation_id,
    role: data.role,
    content: data.content,
    toolCalls: data.tool_calls || undefined,
    sources: data.sources || undefined,
    createdAt: data.created_at,
  };
}

export async function dbUpdateMessage(id: string, updates: { content?: string; toolCalls?: unknown; sources?: unknown }) {
  // Validate UUID format before querying — prevents Postgres type errors
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    console.warn(`dbUpdateMessage: skipping — invalid UUID: ${id}`);
    return;
  }

  const { error } = await supabase()
    .from('messages')
    .update(updates)
    .eq('id', id);

  // Silently ignore — message may not exist if the initial insert failed
  if (error) console.warn('dbUpdateMessage:', error.message);
}

// ============================================================
// PROJECTS
// ============================================================

export async function dbGetProjects(): Promise<Project[]> {
  const { data, error } = await supabase()
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    githubRepo: p.github_repo,
    documentIds: [],
    taskIds: [],
    conversationIds: [],
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

export async function dbCreateProject(project: { name: string; description: string; githubRepo?: string }): Promise<Project> {
  const { data, error } = await supabase()
    .from('projects')
    .insert({ name: project.name, description: project.description, github_repo: project.githubRepo })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    githubRepo: data.github_repo,
    documentIds: [],
    taskIds: [],
    conversationIds: [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function dbUpdateProject(id: string, updates: { name?: string; description?: string; githubRepo?: string }) {
  const { error } = await supabase()
    .from('projects')
    .update({ name: updates.name, description: updates.description, github_repo: updates.githubRepo, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function dbDeleteProject(id: string) {
  const { error } = await supabase()
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// DOCUMENTS
// ============================================================

export async function dbGetDocuments(): Promise<Document[]> {
  const { data, error } = await supabase()
    .from('documents')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((d) => ({
    id: d.id,
    filename: d.filename,
    fileType: d.file_type,
    fileSize: d.file_size,
    chunkCount: d.chunk_count,
    projectId: d.project_id,
    uploadedAt: d.uploaded_at,
    status: d.status,
  }));
}

export async function dbCreateDocument(doc: { filename: string; fileType: string; fileSize: number; projectId?: string }): Promise<Document> {
  const { data, error } = await supabase()
    .from('documents')
    .insert({
      filename: doc.filename,
      file_type: doc.fileType,
      file_size: doc.fileSize,
      project_id: doc.projectId,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    filename: data.filename,
    fileType: data.file_type,
    fileSize: data.file_size,
    chunkCount: data.chunk_count,
    projectId: data.project_id,
    uploadedAt: data.uploaded_at,
    status: data.status,
  };
}

export async function dbUpdateDocument(id: string, updates: { status?: string; chunkCount?: number }) {
  const { error } = await supabase()
    .from('documents')
    .update({ status: updates.status, chunk_count: updates.chunkCount })
    .eq('id', id);

  if (error) throw error;
}

export async function dbDeleteDocument(id: string) {
  const { error } = await supabase()
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// TASKS
// ============================================================

export async function dbGetTasks(): Promise<Task[]> {
  const { data, error } = await supabase()
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    dueDate: t.due_date,
    projectId: t.project_id,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    completedAt: t.completed_at,
  }));
}

export async function dbCreateTask(task: { title: string; description?: string; priority?: string; status?: string; projectId?: string }): Promise<Task> {
  const { data, error } = await supabase()
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      project_id: task.projectId,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    priority: data.priority,
    status: data.status,
    dueDate: data.due_date,
    projectId: data.project_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    completedAt: data.completed_at,
  };
}

export async function dbUpdateTask(id: string, updates: { title?: string; description?: string; priority?: string; status?: string }) {
  const { error } = await supabase()
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString(), completed_at: updates.status === 'done' ? new Date().toISOString() : undefined })
    .eq('id', id);

  if (error) throw error;
}

export async function dbDeleteTask(id: string) {
  const { error } = await supabase()
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// MEMORIES
// ============================================================

export async function dbGetMemories(): Promise<Memory[]> {
  const { data, error } = await supabase()
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((m) => ({
    id: m.id,
    content: m.content,
    type: m.type,
    projectId: m.project_id,
    importance: m.importance,
    createdAt: m.created_at,
    lastAccessedAt: m.last_accessed_at,
  }));
}

export async function dbCreateMemory(memory: { content: string; type?: string; projectId?: string; importance?: number }): Promise<Memory> {
  const { data, error } = await supabase()
    .from('memories')
    .insert({
      content: memory.content,
      type: memory.type || 'fact',
      project_id: memory.projectId,
      importance: memory.importance ?? 0.5,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    content: data.content,
    type: data.type,
    projectId: data.project_id,
    importance: data.importance,
    createdAt: data.created_at,
    lastAccessedAt: data.last_accessed_at,
  };
}

export async function dbDeleteMemory(id: string) {
  const { error } = await supabase()
    .from('memories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
