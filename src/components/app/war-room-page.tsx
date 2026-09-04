'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Swords, Loader2, Send, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { personas, type Persona } from '@/lib/war-room/personas';

interface PersonaResponse {
  personaId: string;
  personaName: string;
  personaTitle: string;
  content: string;
  durationMs: number;
  status: 'success' | 'error';
}

interface DebateResult {
  idea: string;
  responses: PersonaResponse[];
  totalMs: number;
}

function PersonaCard({ persona, response, index }: { persona: Persona; response?: PersonaResponse; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const isLoaded = !!response;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'rounded-2xl border bg-gradient-to-br backdrop-blur-sm overflow-hidden transition-all',
        persona.gradient,
        persona.borderColor,
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-2xl shrink-0">{persona.emoji}</span>
        <div className="flex-1 text-left min-w-0">
          <p className={cn('text-sm font-semibold', persona.textColor)}>{persona.name}</p>
          <p className="text-[11px] text-white/30 truncate">{persona.title}</p>
        </div>
        {isLoaded && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-white/20">{response.durationMs}ms</span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-white/20" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-white/20" />
            )}
          </div>
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {!isLoaded ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-white/25">{persona.name} is thinking...</span>
                </div>
              ) : response.status === 'error' ? (
                <p className="text-sm text-red-400/70 py-2">{response.content}</p>
              ) : (
                <div className="text-sm text-white/70 leading-relaxed prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p({ children }) {
                        return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
                      },
                      strong({ children }) {
                        return <strong className="font-semibold text-white/90">{children}</strong>;
                      },
                      em({ children }) {
                        return <em className="italic text-white/60">{children}</em>;
                      },
                      ul({ children }) {
                        return <ul className="mb-2 space-y-0.5 list-disc list-inside">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="mb-2 space-y-0.5 list-decimal list-inside">{children}</ol>;
                      },
                      li({ children }) {
                        return <li className="text-white/70">{children}</li>;
                      },
                      h3({ children }) {
                        return <h3 className="text-sm font-semibold text-white/80 mb-1 mt-2">{children}</h3>;
                      },
                      blockquote({ children }) {
                        return (
                          <blockquote className="border-l-2 border-white/10 pl-3 my-2 text-white/40 italic">
                            {children}
                          </blockquote>
                        );
                      },
                    }}
                  >
                    {response.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function VerdictBar({ responses }: { responses: PersonaResponse[] }) {
  if (responses.length === 0) return null;

  const successCount = responses.filter((r) => r.status === 'success').length;
  const avgDuration = Math.round(
    responses.reduce((sum, r) => sum + r.durationMs, 0) / responses.length
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/30"
    >
      <div className="flex items-center gap-4">
        <span>
          <span className="text-white/60 font-medium">{successCount}</span>/{responses.length} personas responded
        </span>
        <span>
          Avg <span className="text-white/60 font-medium">{avgDuration}ms</span>
        </span>
      </div>
      <span className="text-white/20">
        Total: {(responses.reduce((sum, r) => sum + r.durationMs, 0) / 1000).toFixed(1)}s
      </span>
    </motion.div>
  );
}

export default function WarRoomPage() {
  const [idea, setIdea] = useState('');
  const [result, setResult] = useState<DebateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(personas.map((p) => p.id));
  const [streamingResponses, setStreamingResponses] = useState<Map<string, PersonaResponse>>(new Map());

  const togglePersona = (id: string) => {
    setSelectedPersonas((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleDebate = async () => {
    if (!idea.trim() || loading) return;
    if (selectedPersonas.length === 0) return;

    setLoading(true);
    setResult(null);
    setStreamingResponses(new Map());

    // Show thinking cards for all selected personas immediately
    const initialMap = new Map<string, PersonaResponse>();
    for (const p of personas.filter((p) => selectedPersonas.includes(p.id))) {
      initialMap.set(p.id, {
        personaId: p.id,
        personaName: p.name,
        personaTitle: p.title,
        content: '',
        durationMs: 0,
        status: 'success',
      });
    }
    setStreamingResponses(initialMap);

    try {
      const res = await fetch('/api/war-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim(), personaIds: selectedPersonas }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start debate');
      }

      const data: DebateResult = await res.json();

      // Animate responses appearing one by one
      for (let i = 0; i < data.responses.length; i++) {
        const resp = data.responses[i];
        setStreamingResponses((prev) => {
          const next = new Map(prev);
          next.set(resp.personaId, resp);
          return next;
        });
        // Small delay between cards for visual effect
        if (i < data.responses.length - 1) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      // Set final result after all cards are visible
      await new Promise((r) => setTimeout(r, 300));
      setResult(data);
    } catch (error) {
      console.error('[WarRoom] Error:', error);
      // Show error in all cards
      const errorMap = new Map<string, PersonaResponse>();
      for (const p of personas.filter((p) => selectedPersonas.includes(p.id))) {
        errorMap.set(p.id, {
          personaId: p.id,
          personaName: p.name,
          personaTitle: p.title,
          content: `Error: ${error instanceof Error ? error.message : 'Failed to connect to agent'}`,
          durationMs: 0,
          status: 'error',
        });
      }
      setStreamingResponses(errorMap);
    }

    setLoading(false);
  };

  const handleReset = () => {
    setResult(null);
    setStreamingResponses(new Map());
    setIdea('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDebate();
    }
  };

  const responses = result?.responses || Array.from(streamingResponses.values());
  const hasResults = responses.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 h-12 md:h-14 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3 pl-10 md:pl-0">
          <Swords className="w-4 h-4 text-white/40" />
          <h1 className="text-sm font-medium text-white">War Room</h1>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Debating...</span>
            </div>
          )}
        </div>
        {hasResults && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            New Debate
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero Section — shown when no results */}
        {!hasResults && (
          <div className="flex flex-col items-center justify-center px-4 py-16 md:py-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-lg"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center mx-auto mb-6">
                <Swords className="w-7 h-7 text-white/30" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">War Room</h2>
              <p className="text-sm text-white/30 mb-8">
                Pitch an idea and watch 6 AI personas debate it from different angles —
                analytical, financial, emotional, ethical, contrarian, and visionary.
              </p>

              {/* Persona selector */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePersona(p.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all',
                      selectedPersonas.includes(p.id)
                        ? cn(p.borderColor, p.textColor, 'bg-white/[0.04]')
                        : 'border-white/[0.06] text-white/20 hover:text-white/40 hover:border-white/[0.12]'
                    )}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.name.replace('The ', '')}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Results grid */}
        {hasResults && (
          <div className="p-4 md:p-6 space-y-3">
            {/* Idea banner */}
            <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
              <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">The Idea</p>
              <p className="text-sm text-white/70">{result?.idea || idea}</p>
            </div>

            {/* Verdict bar */}
            <VerdictBar responses={responses} />

            {/* Persona cards */}
            <div className="space-y-3">
              {personas
                .filter((p) => selectedPersonas.includes(p.id))
                .map((persona, i) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    response={responses.find((r) => r.personaId === persona.id)}
                    index={i}
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Input — always at bottom */}
      <div className="px-3 sm:px-4 md:px-6 pb-4 md:pb-5 pt-2 md:pt-3 safe-area-inset border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-[#161616] border border-white/[0.08] rounded-2xl focus-within:border-white/[0.15] transition-colors shadow-lg shadow-black/40">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pitch your idea for the war room..."
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/20 outline-none resize-none max-h-32 pl-4 pr-14 py-3.5 min-h-[44px]"
            />
            <button
              onClick={handleDebate}
              disabled={!idea.trim() || loading || selectedPersonas.length === 0}
              className={cn(
                'absolute right-3 bottom-3 p-2 rounded-xl transition-all',
                idea.trim() && !loading && selectedPersonas.length > 0
                  ? 'bg-white text-black hover:bg-white/90 shadow-md'
                  : 'text-white/10'
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-white/15 text-center mt-2.5">
            {selectedPersonas.length} persona{selectedPersonas.length !== 1 ? 's' : ''} selected · Press Enter to debate
          </p>
        </div>
      </div>
    </div>
  );
}
