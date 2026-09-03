import { create } from 'zustand';
import type {
  Conversation,
  Message,
  Project,
  Document,
  Task,
  Memory,
  ChatMode,
  AgentStatus,
  PendingConfirmation,
  ResearchProgress,
} from './types';
import { generateId } from './utils';

// ============================================================
// App Store — Central state management
// ============================================================

interface AppState {
  // Navigation
  sidebarOpen: boolean;
  activePage: string;
  setSidebarOpen: (open: boolean) => void;
  setActivePage: (page: string) => void;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  chatMode: ChatMode;
  setActiveConversation: (id: string | null) => void;
  setChatMode: (mode: ChatMode) => void;
  createConversation: (mode?: ChatMode, projectId?: string) => Conversation;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'conversationId' | 'createdAt'>) => Message;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  deleteConversation: (id: string) => void;

  // Agent
  agentStatus: AgentStatus;
  setAgentStatus: (status: Partial<AgentStatus>) => void;
  pendingConfirmation: PendingConfirmation | null;
  setPendingConfirmation: (confirmation: PendingConfirmation | null) => void;

  // Projects
  projects: Project[];
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'documentIds' | 'taskIds' | 'conversationIds'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Documents
  documents: Document[];
  addDocument: (doc: Omit<Document, 'id' | 'uploadedAt' | 'status' | 'chunkCount'>) => Document;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;

  // Tasks
  tasks: Task[];
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Memories
  memories: Memory[];
  addMemory: (memory: Omit<Memory, 'id' | 'createdAt' | 'lastAccessedAt'>) => Memory;
  deleteMemory: (id: string) => void;

  // Research
  researchProgress: ResearchProgress | null;
  setResearchProgress: (progress: ResearchProgress | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // --- Navigation ---
  sidebarOpen: true,
  activePage: 'dashboard',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActivePage: (page) => set({ activePage: page }),

  // --- Conversations ---
  conversations: [],
  activeConversationId: null,
  chatMode: 'chat',

  setActiveConversation: (id) => set({ activeConversationId: id }),
  setChatMode: (mode) => set({ chatMode: mode }),

  createConversation: (mode = 'chat', projectId) => {
    const conversation: Conversation = {
      id: generateId(),
      title: 'New Conversation',
      mode,
      projectId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: conversation.id,
    }));
    return conversation;
  },

  addMessage: (conversationId, msg) => {
    const message: Message = {
      ...msg,
      id: generateId(),
      conversationId,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [...c.messages, message],
              updatedAt: new Date().toISOString(),
              title:
                c.messages.length === 0 && msg.role === 'user'
                  ? msg.content.slice(0, 50) + (msg.content.length > 50 ? '…' : '')
                  : c.title,
            }
          : c
      ),
    }));
    return message;
  },

  updateMessage: (conversationId, messageId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
            }
          : c
      ),
    }));
  },

  deleteConversation: (id) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    }));
  },

  // --- Agent ---
  agentStatus: { isProcessing: false, toolsInUse: [] },
  setAgentStatus: (status) =>
    set((state) => ({
      agentStatus: { ...state.agentStatus, ...status },
    })),
  pendingConfirmation: null,
  setPendingConfirmation: (confirmation) =>
    set({ pendingConfirmation: confirmation }),

  // --- Projects ---
  projects: [],
  activeProjectId: null,

  setActiveProject: (id) => set({ activeProjectId: id }),

  createProject: (project) => {
    const p: Project = {
      ...project,
      id: generateId(),
      documentIds: [],
      taskIds: [],
      conversationIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ projects: [...state.projects, p] }));
    return p;
  },

  updateProject: (id, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
    }));
  },

  // --- Documents ---
  documents: [],

  addDocument: (doc) => {
    const d: Document = {
      ...doc,
      id: generateId(),
      chunkCount: 0,
      uploadedAt: new Date().toISOString(),
      status: 'processing',
    };
    set((state) => ({ documents: [...state.documents, d] }));
    return d;
  },

  updateDocument: (id, updates) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
  },

  deleteDocument: (id) => {
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    }));
  },

  // --- Tasks ---
  tasks: [],

  createTask: (task) => {
    const t: Task = {
      ...task,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ tasks: [...state.tasks, t] }));
    return t;
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              ...updates,
              updatedAt: new Date().toISOString(),
              completedAt: updates.status === 'done' ? new Date().toISOString() : t.completedAt,
            }
          : t
      ),
    }));
  },

  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  // --- Memories ---
  memories: [],

  addMemory: (memory) => {
    const m: Memory = {
      ...memory,
      id: generateId(),
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    set((state) => ({ memories: [...state.memories, m] }));
    return m;
  },

  deleteMemory: (id) => {
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    }));
  },

  // --- Research ---
  researchProgress: null,
  setResearchProgress: (progress) => set({ researchProgress: progress }),
}));
