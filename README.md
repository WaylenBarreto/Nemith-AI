# Nemith

Personal AI Developer Workspace — an autonomous agent that chats, searches the web, reads GitHub repos, queries your documents, and manages tasks.
<img width="1900" height="910" alt="image" src="https://github.com/user-attachments/assets/20b8a869-450c-4de2-9494-b9aedb3a3846" />
<img width="1900" height="911" alt="image" src="https://github.com/user-attachments/assets/b30c7e5f-135f-4be3-9799-01e5f87c004d" />
<img width="1905" height="912" alt="image" src="https://github.com/user-attachments/assets/501f25d2-725e-4887-b5b7-3b9804602d9f" />
<img width="1903" height="911" alt="image" src="https://github.com/user-attachments/assets/ceec74e2-7329-40f8-8696-94656e8d9fb9" />



## Quick Start

```bash
# Clone
git clone https://github.com/your-username/nemith.git
cd nemith

# Install
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your API keys (see below)

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page, then [http://localhost:3000/app](http://localhost:3000/app) for the workspace.

## API Keys

| Key | Required | Get it at |
|-----|----------|-----------|
| `OPENROUTER_API_KEY` | Yes | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | No | Default: `openai/gpt-4o` |
| `SERPER_API_KEY` | For web search | [serper.dev](https://serper.dev/) |
| `GITHUB_TOKEN` | For repo access | [github.com/settings/tokens](https://github.com/settings/tokens) |

```env
# .env.local
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o
SERPER_API_KEY=...
GITHUB_TOKEN=ghp_...
```

## Features

### Agent Tools (14 built-in)

| Tool | Description |
|------|-------------|
| `web_search` | Search Google via Serper API |
| `search_documents` | Query uploaded PDFs/docs via BM25 similarity |
| `list_documents` | See what documents are available |
| `github_list_repos` | List repos (yours or any user's) |
| `github_browse` | Browse a repo's file tree |
| `github_read_file` | Read any file from a GitHub repo |
| `github_search_code` | Search code within a repo |
| `github_readme` | Read a repo's README |
| `read_file` | Read local project files |
| `write_file` | Create or modify files |
| `list_directory` | Browse project structure |
| `run_terminal` | Execute shell commands |
| `create_task` | Add tasks to the board |
| `memory_store` | Save info for future sessions |

### Pages

- **Dashboard** — Overview with stats, quick actions, recent activity
- **Chat** — Agent conversation with tool calling, streaming responses, thinking indicators
- **Projects** — Create and manage projects with GitHub repo links
- **Documents** — Upload PDFs/TXTs/DOCX for RAG-powered Q&A
- **Tasks** — Kanban board (To Do, In Progress, Done)

### Landing Page

Minimal black-and-white design with Three.js star field background, matching the Luna UI aesthetic.

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── app/page.tsx              # Workspace entry
│   └── api/
│       ├── chat/route.ts         # Streaming agent API (SSE)
│       └── documents/route.ts    # Document upload + RAG indexing
├── lib/
│   ├── agent/
│   │   ├── core.ts               # LangChain agent loop
│   │   ├── llm.ts                # OpenRouter LLM provider
│   │   └── tools/
│   │       ├── index.ts          # Tool registry
│   │       ├── github.ts         # 5 GitHub read-only tools
│   │       └── documents.ts      # RAG search tools
│   ├── rag/
│   │   ├── chunker.ts            # Text chunking (~500 chars)
│   │   ├── extractor.ts          # PDF/TXT/MD/DOCX extraction
│   │   └── store.ts              # In-memory BM25 vector store
│   ├── chat.ts                   # Frontend SSE streaming client
│   ├── store.ts                  # Zustand state management
│   └── types.ts                  # TypeScript types
├── components/
│   ├── app/
│   │   ├── app-shell.tsx         # Main layout + 3D background
│   │   ├── sidebar.tsx           # Navigation sidebar
│   │   ├── dashboard-page.tsx
│   │   ├── chat-page.tsx
│   │   ├── projects-page.tsx
│   │   ├── documents-page.tsx
│   │   └── tasks-page.tsx
│   ├── star-field.tsx            # Three.js landing page stars
│   └── ui/                       # Button, Input, Modal
└── docs/
    └── FRAMEWORK_PLAN.md         # Full implementation roadmap
```

## Tech Stack

- **Framework:** Next.js 16 + React 19
- **Agent:** LangChain.js + OpenRouter (200+ models)
- **Styling:** Tailwind CSS 4
- **3D:** Three.js + @react-three/fiber
- **State:** Zustand
- **Animations:** Framer Motion
- **Database:** SQLite (via better-sqlite3 + Drizzle ORM)
- **RAG:** BM25 keyword similarity (no embeddings API needed)

## Models

OpenRouter gives access to 200+ models. Update `OPENROUTER_MODEL` in `.env.local`:

```env
# Free models
OPENROUTER_MODEL=minimax/minimax-m3:free

# Paid models
OPENROUTER_MODEL=openai/gpt-4o
OPENROUTER_MODEL=anthropic/claude-sonnet-4
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct
```

## License

MIT
