import { NextRequest } from 'next/server';
import { createLLM, invokeWithFallback, getActiveProvider, resetCallCount } from '@/lib/agent/llm';
import { personas } from '@/lib/war-room/personas';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export async function POST(req: NextRequest) {
  const reqStart = Date.now();

  try {
    const { idea, personaIds } = await req.json();

    if (!idea || typeof idea !== 'string') {
      return Response.json({ error: 'Idea is required' }, { status: 400 });
    }

    // Check for API keys (OpenRouter primary, Gemini fallback)
    if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: 'No API key configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    // Select which personas to use (default: all)
    const activePersonas = personaIds && personaIds.length > 0
      ? personas.filter((p) => personaIds.includes(p.id))
      : personas;

    console.log(`[WarRoom] Debate started — ${activePersonas.length} personas, idea: "${idea.slice(0, 60)}..."`);

    resetCallCount();
    const llm = createLLM({
      temperature: 0.8,
      maxTokens: 4000,
    });

    console.log(`[WarRoom] Using provider: ${getActiveProvider()}`);

    // Run all personas in parallel
    const results = await Promise.allSettled(
      activePersonas.map(async (persona) => {
        const startTime = Date.now();

        const response = await invokeWithFallback(llm, [
          new SystemMessage(persona.systemPrompt),
          new HumanMessage(
            `Here is the idea to evaluate:\n\n"${idea}"\n\n` +
            `Give your perspective. Be specific, be bold, and don't hold back.`
          ),
        ], 30000, `WarRoom ${persona.name}`);

        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

        const duration = Date.now() - startTime;
        console.log(`[WarRoom] ${persona.name} responded in ${duration}ms (${content.length} chars)`);

        return {
          personaId: persona.id,
          personaName: persona.name,
          personaTitle: persona.title,
          content,
          durationMs: duration,
        };
      })
    );

    // Format results
    const responses = results.map((result, i) => {
      if (result.status === 'fulfilled') {
        return { ...result.value, status: 'success' as const };
      } else {
        console.error(`[WarRoom] ${activePersonas[i].name} failed:`, result.reason);
        return {
          personaId: activePersonas[i].id,
          personaName: activePersonas[i].name,
          personaTitle: activePersonas[i].title,
          content: `Failed to generate response: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`,
          durationMs: 0,
          status: 'error' as const,
        };
      }
    });

    const totalMs = Date.now() - reqStart;
    console.log(`[WarRoom] All ${responses.length} personas responded in ${totalMs}ms`);

    return Response.json({
      idea,
      responses,
      totalMs,
    });
  } catch (error) {
    console.error('[WarRoom] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
