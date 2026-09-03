// ============================================================
// NEMITH — Core Application Types
// ============================================================

// --- Conversations & Messages ---

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type ChatMode = 'chat' | 'research' | 'project' | 'knowledge';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: unknown;
  error?: string;
  durationMs?: number;
}

export interface Source {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
  type: 'web' | 'document' | 'github' | 'memory';
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  sources?: Source[];
  createdAt: string;
  pending?: boolean;
  agentStatus?: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: ChatMode;
  projectId?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// --- Projects ---

export interface Project {
  id: string;
  name: string;
  description: string;
  githubRepo?: string;
  documentIds: string[];
  taskIds: string[];
  conversationIds: string[];
  createdAt: string;
  updatedAt: string;
}

// --- Documents & RAG ---

export interface Document {
  id: string;
  filename: string;
  fileType: 'pdf' | 'txt' | 'md' | 'docx';
  fileSize: number;
  chunkCount: number;
  projectId?: string;
  uploadedAt: string;
  status: 'processing' | 'ready' | 'error';
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber?: number;
  chunkIndex: number;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

// --- Tasks ---

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// --- Memory ---

export type MemoryType = 'preference' | 'fact' | 'context';

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  projectId?: string;
  importance: number; // 0-1
  createdAt: string;
  lastAccessedAt: string;
}

// --- GitHub ---

export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  updatedAt: string;
}

export interface GitHubFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  body: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

// --- Research ---

export type ResearchStep =
  | 'understanding'
  | 'planning'
  | 'searching'
  | 'retrieving'
  | 'comparing'
  | 'synthesizing'
  | 'complete';

export interface ResearchProgress {
  currentStep: ResearchStep;
  completedSteps: ResearchStep[];
  sourcesFound: number;
  message: string;
}

export interface ResearchReport {
  id: string;
  query: string;
  executiveSummary: string;
  keyFindings: string[];
  concepts: string[];
  recommendations: string[];
  sources: Source[];
  createdAt: string;
}

// --- Agent State ---

export interface AgentStatus {
  isProcessing: boolean;
  currentAction?: string;
  toolsInUse: string[];
}

// --- Confirmation ---

export interface PendingConfirmation {
  id: string;
  action: string;
  description: string;
  data: Record<string, unknown>;
}
