'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Send,
  Bot,
  User,
  Wrench,
  Search,
  ExternalLink,
  Loader2,
  Globe,
  FileText,
  BookOpen,
  Zap,
  ChevronDown,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import type { Message, ToolCall, Source, ChatMode } from '@/lib/types';

const modeOptions: { id: ChatMode; label: string; icon: typeof Bot }[] = [
  { id: 'chat', label: 'Chat', icon: Bot },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'project', label: 'Project', icon: Wrench },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 rounded-md text-white/15 hover:text-white/50 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function ToolCallBadge({ tool }: { tool: ToolCall }) {
  return (
    <div className={cn('tool-badge', tool.status === 'running' && 'active')}>
      {tool.status === 'running' ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : tool.status === 'completed' ? (
        <Zap className="w-3 h-3" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
      )}
      <span>{tool.name}</span>
      {tool.durationMs && (
        <span className="text-white/20 text-[10px]">{tool.durationMs}ms</span>
      )}
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
  const icons = { web: Globe, document: FileText, github: Globe, memory: BookOpen };
  const Icon = icons[source.type];
  return (
    <div className="source-card flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-white/40" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{source.title}</p>
        {source.snippet && (
          <p className="text-xs text-white/30 mt-0.5 line-clamp-2">{source.snippet}</p>
        )}
      </div>
      {source.url && (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 rounded-md text-white/20 hover:text-white/60 transition-colors">
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeStr = String(children).replace(/\n$/, '');
          if (match) {
            return (
              <div className="relative group my-3">
                <div className="flex items-center justify-between px-4 py-1.5 rounded-t-lg bg-[#1e1e1e] border border-white/[0.06] border-b-0">
                  <span className="text-[10px] text-white/25 font-mono">{match[1]}</span>
                  <CopyButton text={codeStr} />
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    background: '#0d0d0d',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderTop: 'none',
                    fontSize: '13px',
                    lineHeight: '1.6',
                  }}
                >
                  {codeStr}
                </SyntaxHighlighter>
              </div>
            );
          }
          return (
            <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70 font-mono text-[13px]" {...props}>
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-3 space-y-1 list-disc list-inside">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-3 space-y-1 list-decimal list-inside">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-white/80 leading-relaxed">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-xl font-bold text-white mb-3 mt-4">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-semibold text-white mb-2 mt-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-semibold text-white mb-2 mt-3">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-white/20 pl-4 my-3 text-white/50 italic">
              {children}
            </blockquote>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 underline decoration-white/20 hover:text-white/80 transition-colors"
            >
              {children}
            </a>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3">
              <table className="w-full text-sm border border-white/[0.06] rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-white/[0.04]">{children}</thead>;
        },
        th({ children }) {
          return <th className="px-3 py-2 text-left text-xs font-medium text-white/50 border-b border-white/[0.06]">{children}</th>;
        },
        td({ children }) {
          return <td className="px-3 py-2 text-white/70 border-b border-white/[0.04]">{children}</td>;
        },
        hr() {
          return <hr className="border-white/[0.06] my-4" />;
        },
        strong({ children }) {
          return <strong className="font-semibold text-white">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic text-white/70">{children}</em>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [expandedTools, setExpandedTools] = useState(false);
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  if (isTool) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-3 px-4 md:px-6', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-white/[0.08] border border-white/[0.06] flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-3.5 h-3.5 text-white/60" />
        </div>
      )}

      <div className={cn('max-w-2xl', isUser ? 'order-first' : '')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'bg-white text-black rounded-tr-md'
              : 'bg-[#111] border border-white/[0.06] text-white/80 rounded-tl-md'
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <div className={message.pending ? 'animate-pulse' : ''}>
              <MarkdownContent content={message.content || (message.pending ? '' : 'No response.')} />
              {message.pending && !message.content && (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-white/25 ml-1">Thinking...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setExpandedTools(!expandedTools)}
              className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors"
            >
              <Wrench className="w-3 h-3" />
              {message.toolCalls.length} tool call{message.toolCalls.length > 1 ? 's' : ''}
              <ChevronDown className={cn('w-3 h-3 transition-transform', expandedTools && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {expandedTools && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-wrap gap-1.5 mt-1.5 overflow-hidden"
                >
                  {message.toolCalls.map((tc) => (
                    <ToolCallBadge key={tc.id} tool={tc} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-white/25 font-medium">Sources</p>
            {message.sources.map((src) => (
              <SourceCard key={src.id} source={src} />
            ))}
          </div>
        )}

        <p className="text-[10px] text-white/15 mt-1 px-1">{formatTime(message.createdAt)}</p>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0 mt-1">
          <User className="w-3.5 h-3.5 text-white/40" />
        </div>
      )}
    </motion.div>
  );
}

function EmptyState({ onStart }: { onStart: (text: string) => void }) {
  const suggestions = [
    'Explain how this codebase works',
    'Research React server components',
    'Help me refactor the auth module',
    'Summarize project changes',
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5">
        <Bot className="w-6 h-6 text-white/30" />
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">How can I help?</h2>
      <p className="text-sm text-white/30 mb-8 text-center max-w-md">
        Write code, research topics, manage projects, and work with documents.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full px-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onStart(s)}
            className="text-left px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm text-white/40 hover:border-white/[0.12] hover:text-white/60 hover:bg-white/[0.04] transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const {
    conversations,
    activeConversationId,
    chatMode,
    setChatMode,
    addMessage,
    agentStatus,
  } = useAppStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const conversation = conversations.find((c) => c.id === activeConversationId);
  const messages = conversation?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const handleSend = useCallback(async (text?: string) => {
    const content = text || input.trim();
    if (!content) return;

    let convoId = activeConversationId;
    if (!convoId) {
      const newConvo = useAppStore.getState().createConversation(chatMode);
      convoId = newConvo.id;
    }

    addMessage(convoId, { role: 'user', content });
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // Create placeholder for streaming response
    const assistantMsg = addMessage(convoId, { role: 'assistant', content: '', pending: true });
    const toolCallsList: { id: string; name: string; args: Record<string, unknown>; status: 'running' | 'completed'; durationMs?: number }[] = [];

    useAppStore.getState().setAgentStatus({ isProcessing: true, currentAction: 'Thinking...' });

    // Build conversation history for context
    const history = useAppStore.getState().conversations
      .find((c) => c.id === convoId)
      ?.messages.slice(0, -1)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })) || [];

    try {
      const { sendMessage } = await import('@/lib/chat');
      let fullText = '';

      await sendMessage({
        message: content,
        conversationHistory: history,
        mode: chatMode,
        onEvent: (event) => {
          if (event.type === 'status') {
            useAppStore.getState().setAgentStatus({ isProcessing: true, currentAction: event.content });
          } else if (event.type === 'tool_call') {
            const tc = { id: event.id || `tc_${Date.now()}`, name: event.name || 'unknown', args: event.args || {}, status: 'running' as const };
            toolCallsList.push(tc);
            useAppStore.getState().setAgentStatus({ isProcessing: true, currentAction: `Running ${event.name}...` });
          } else if (event.type === 'tool_result') {
            const existing = toolCallsList.find((t) => t.id === event.toolCallId);
            if (existing) existing.status = 'completed';
          } else if (event.type === 'text' && event.content) {
            fullText += event.content;
            // Update message in real-time for streaming effect
            useAppStore.getState().updateMessage(convoId, assistantMsg.id, {
              content: fullText,
              toolCalls: toolCallsList.length > 0 ? toolCallsList : undefined,
            });
          } else if (event.type === 'error') {
            fullText = event.content ? `Error: ${event.content}` : 'Unknown error occurred';
          }
        },
      });

      useAppStore.getState().updateMessage(convoId, assistantMsg.id, {
        content: fullText || 'No response received.',
        toolCalls: toolCallsList.length > 0 ? toolCallsList : undefined,
        pending: false,
      });
    } catch (error) {
      useAppStore.getState().updateMessage(convoId, assistantMsg.id, {
        content: `Error: ${error instanceof Error ? error.message : 'Failed to connect to agent'}`,
        pending: false,
      });
    }

    useAppStore.getState().setAgentStatus({ isProcessing: false, currentAction: undefined });
  }, [input, activeConversationId, chatMode, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExport = () => {
    if (!conversation) return;
    const lines = [
      `# ${conversation.title}`,
      '',
      `*Exported from Nemith on ${new Date().toLocaleDateString()}*`,
      '',
      '---',
      '',
    ];
    for (const msg of conversation.messages) {
      if (msg.role === 'tool') continue;
      const role = msg.role === 'user' ? 'You' : 'Nemith';
      lines.push(`## ${role}`, '', msg.content, '');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 h-12 md:h-14 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3 min-w-0 pl-10 md:pl-0">
          <h1 className="text-sm font-medium text-white truncate">
            {conversation?.title || 'New Chat'}
          </h1>
          {agentStatus.isProcessing && (
            <div className="flex items-center gap-1.5 text-xs text-white/50 shrink-0">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">{agentStatus.currentAction || 'Processing...'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* Export button */}
          {messages.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
              title="Export as Markdown"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          {/* Mode selector */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.04]">
            {modeOptions.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setChatMode(mode.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                  chatMode === mode.id
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/25 hover:text-white/50'
                )}
              >
                <mode.icon className="w-3 h-3" />
                <span className="hidden md:inline">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {messages.length === 0 ? (
        <EmptyState onStart={handleSend} />
      ) : (
        <div className="flex-1 overflow-y-auto py-4 md:py-6 space-y-4 md:space-y-6">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="px-3 sm:px-4 md:px-6 pb-4 md:pb-5 pt-2 md:pt-3 safe-area-inset">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-[#161616] border border-white/[0.08] rounded-2xl focus-within:border-white/[0.15] transition-colors shadow-lg shadow-black/40">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/20 outline-none resize-none max-h-40 pl-4 pr-14 py-3.5 min-h-[44px]"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || agentStatus.isProcessing}
              className={cn(
                'absolute right-3 bottom-3 p-2 rounded-xl transition-all',
                input.trim() && !agentStatus.isProcessing
                  ? 'bg-white text-black hover:bg-white/90 shadow-md'
                  : 'text-white/10'
              )}
            >
              {agentStatus.isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-white/15 text-center mt-2.5">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
