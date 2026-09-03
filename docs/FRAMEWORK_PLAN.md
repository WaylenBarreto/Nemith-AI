# Nemith Framework — Implementation Plan

## Architecture Overview

Nemith is a personal AI developer workspace with an autonomous agent that can:
- Chat with users and execute multi-step tasks
- Search the web for real-time information
- Read, write, and analyze code in project repositories
- Upload and query documents via RAG (Retrieval-Augmented Generation)
- Manage tasks and track project progress
- Maintain persistent memory across sessions

---

## Phase 1: Core Agent Loop

### 1.1 — Agent Runtime

The central piece: an LLM-powered agent loop that receives user messages, decides what tools to call, executes them, and returns results.

```
User Message → Agent Loop → [Tool Calls] → [Observations] → Response
                ↑                                        |
                └────────────── Loop ─────────────────────┘
```

**Implementation:**
- `src/lib/agent/core.ts` — Main agent loop
- `src/lib/agent/types.ts` — Agent-specific types (extends existing types.ts)
- `src/lib/agent/prompts.ts` — System prompts and prompt templates

**Key decisions:**
- Use **Vercel AI SDK** (`ai` package) for streaming LLM responses and tool calling
- Support multiple LLM providers: OpenAI (GPT-4o), Anthropic (Claude), local models
- Agent loop runs server-side in API routes, not client-side

### 1.2 — Tool System

Each tool is a self-contained module with:
- `name` — Unique identifier
- `description` — What it does (sent to LLM)
- `parameters` — JSON Schema for input validation
- `execute(args)` — The actual implementation

**Core tools to build:**

| Tool | Purpose | Phase |
|------|---------|-------|
| `web_search` | Search the internet via Serper/Brave API | 1 |
| `read_file` | Read file contents from project repo | 1 |
| `write_file` | Create or modify files | 1 |
| `list_directory` | Browse project structure | 1 |
| `run_terminal` | Execute shell commands in sandbox | 1 |
| `search_documents` | Query uploaded docs via embeddings | 2 |
| `create_task` | Add tasks to the task board | 1 |
| `update_task` | Modify task status/priority | 1 |
| `memory_store` | Save information to persistent memory | 2 |
| `memory_recall` | Retrieve relevant memories | 2 |
| `github_fetch` | Fetch repo/files/issues via GitHub API | 2 |
| `code_analysis` | AST-level code analysis | 3 |

### 1.3 — Tool Execution Pipeline

```
LLM Response (tool_call) 
  → Validate parameters
  → Check permissions (sandbox limits, rate limits)
  → Execute tool
  → Capture output (with size limits)
  → Return observation to agent loop
  → LLM decides next step or responds to user
```

---

## Phase 2: Backend API

### 2.1 — API Routes

```
src/app/api/
├── chat/route.ts          — POST: Send message, get streaming response
├── conversations/route.ts — CRUD for conversations
├── projects/route.ts      — CRUD for projects  
├── documents/route.ts     — Upload, list, delete documents
├── tasks/route.ts         — CRUD for tasks
├── memory/route.ts        — CRUD for memories
└── github/route.ts        — Proxy for GitHub API calls
```

### 2.2 — Chat API (most important)

```typescript
// POST /api/chat
{
  conversationId: string,
  message: string,
  mode: 'chat' | 'research' | 'project' | 'knowledge',
  projectId?: string
}

// Response: Streaming text + tool call events
// Uses Vercel AI SDK streaming protocol
```

**Streaming events:**
- `text` — Incremental text tokens
- `tool_call` — Tool being invoked (name, args)
- `tool_result` — Tool output
- `sources` — Web search results
- `done` — Response complete

### 2.3 — Database

Start simple, scale later:

| Option | When to use |
|--------|-------------|
| **SQLite** (via better-sqlite3) | Local dev, single user |
| **PostgreSQL** (via Drizzle ORM) | Production, multi-user |
| **Turso** (SQLite edge) | Serverless deployment |

**Schema (Drizzle ORM):**

```sql
-- Core tables
conversations (id, title, mode, project_id, created_at, updated_at)
messages (id, conversation_id, role, content, tool_calls, sources, created_at)
projects (id, name, description, github_repo, created_at, updated_at)
documents (id, filename, file_type, file_size, chunk_count, project_id, status, uploaded_at)
document_chunks (id, document_id, content, chunk_index, embedding, metadata)
tasks (id, title, description, priority, status, due_date, project_id, created_at, updated_at)
memories (id, content, type, project_id, importance, created_at, last_accessed_at)
```

---

## Phase 3: RAG Pipeline

### 3.1 — Document Processing

```
Upload File 
  → Extract text (pdf-parse, mammoth for docx)
  → Split into chunks (500-1000 tokens, with overlap)
  → Generate embeddings (OpenAI text-embedding-3-small)
  → Store chunks + embeddings in database
```

### 3.2 — Retrieval

```
User Query
  → Generate query embedding
  → Vector similarity search (cosine distance)
  → Return top-K relevant chunks
  → Inject into LLM context as ground truth
```

**Stack:**
- Embeddings: OpenAI `text-embedding-3-small` (1536 dimensions)
- Vector storage: Start with in-memory, migrate to pgvector or Pinecone
- Chunking: 512 tokens with 50-token overlap

---

## Phase 4: Integrations

### 4.1 — GitHub Integration

```typescript
// Connect a GitHub repo to a project
// Agent can: list files, read code, create issues, open PRs

GET  /api/github/repos          — List user repos
GET  /api/github/repos/:owner/:repo/files — Browse file tree
GET  /api/github/repos/:owner/:repo/file?path=... — Read file
POST /api/github/repos/:owner/:repo/issues — Create issue
```

**Auth:** GitHub Personal Access Token stored per-user in DB

### 4.2 — Web Search

```typescript
// Agent searches the web when user asks research questions
// Uses Serper API (Google search results) or Brave Search API

const results = await webSearch("React server components best practices");
// Returns: [{ title, url, snippet, publishedDate }]
```

### 4.3 — Terminal Execution (Sandboxed)

```typescript
// Run commands in isolated environment
// Docker container or serverless function with timeout

const result = await runTerminal("npm test", { 
  cwd: "/project/path",
  timeout: 30000 
});
// Returns: { stdout, stderr, exitCode, duration }
```

---

## Phase 5: Advanced Features

### 5.1 — Research Mode

When mode is "research", the agent runs a multi-step pipeline:

```
1. Understand the query
2. Break into sub-questions
3. Search web for each sub-question
4. Retrieve from documents if available
5. Compare and cross-reference sources
6. Synthesize into a structured report
7. Present findings with citations
```

Track progress via the existing `ResearchProgress` type.

### 5.2 — Project Mode

When mode is "project", the agent has full access to project files:

```
1. Understand the codebase structure
2. Read relevant files
3. Analyze the code
4. Suggest or implement changes
5. Run tests to verify
6. Explain what was done
```

### 5.3 — Memory System

```
After each conversation:
  → LLM decides if anything should be remembered
  → Stores as preference, fact, or context
  → Next conversation: relevant memories are injected into context
  → Memories decay over time unless accessed (importance weighting)
```

---

## Phase 6: Frontend Integration

### 6.1 — Wire Chat to Real API

Replace the simulated responses with actual API calls:

```typescript
// src/lib/chat.ts
export async function sendMessage(message: string, conversationId: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ conversationId, message })
  });
  
  // Stream the response
  const reader = response.body.getReader();
  // Parse streaming events and update UI
}
```

### 6.2 — Real-time Updates

- Server-Sent Events (SSE) for streaming responses
- WebSocket for real-time task/document updates
- Optimistic UI updates with Zustand

---

## Recommended Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| LLM | LangChain + OpenRouter | 200+ models via single API key |
| Backend | Next.js API Routes | Already in project, zero setup |
| Database | Drizzle + SQLite (dev) / PostgreSQL (prod) | Type-safe ORM, easy migration |
| Embeddings | OpenAI text-embedding-3-small | Best cost/quality ratio |
| Vector Search | pgvector or in-memory cosine | Simple to start |
| File Processing | pdf-parse + mammoth | PDF and DOCX extraction |
| GitHub | Octokit | Official GitHub SDK |
| Web Search | Serper API | Fast, cheap Google results |
| Terminal | Docker / serverless | Sandboxed execution |
| Auth | NextAuth.js | If multi-user needed |

---

## Build Order (Suggested)

```
Week 1: Agent core + basic tool system + chat API + streaming
Week 2: File tools (read/write/list) + terminal execution  
Week 3: Document upload + RAG pipeline + search_documents tool
Week 4: GitHub integration + web_search tool
Week 5: Memory system + research mode
Week 6: Polish, error handling, rate limits, deployment
```

---

## File Structure

```
src/
├── lib/
│   ├── agent/
│   │   ├── core.ts              — Agent loop
│   │   ├── types.ts             — Agent types
│   │   ├── prompts.ts           — System prompts
│   │   └── tools/
│   │       ├── index.ts         — Tool registry
│   │       ├── web-search.ts    
│   │       ├── read-file.ts     
│   │       ├── write-file.ts    
│   │       ├── list-directory.ts
│   │       ├── run-terminal.ts  
│   │       ├── search-docs.ts   
│   │       ├── memory.ts        
│   │       ├── tasks.ts         
│   │       └── github.ts        
│   ├── db/
│   │   ├── schema.ts            — Drizzle schema
│   │   ├── index.ts             — DB connection
│   │   └── migrations/          
│   ├── rag/
│   │   ├── chunk.ts             — Text chunking
│   │   ├── embed.ts             — Embedding generation
│   │   ├── index.ts             — RAG pipeline
│   │   └── search.ts            — Vector search
│   └── integrations/
│       ├── github.ts            — GitHub API wrapper
│       ├── search.ts            — Web search API
│       └── llm.ts               — LLM provider abstraction
├── app/api/
│   ├── chat/route.ts
│   ├── conversations/route.ts
│   ├── documents/route.ts
│   ├── projects/route.ts
│   ├── tasks/route.ts
│   ├── memory/route.ts
│   └── github/route.ts
└── components/app/
    ├── chat-page.tsx            — Wire to real API
    └── ... (existing UI)
```
