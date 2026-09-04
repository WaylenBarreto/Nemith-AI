import { NextRequest } from 'next/server';
import { runAgent } from '@/lib/agent/core';

export async function POST(req: NextRequest) {
  const reqStart = Date.now();
  console.log(`[API /chat] Request received`);
  try {
    const { message, conversationHistory, mode, projectId, model, temperature, maxTokens } = await req.json();
    console.log(`[API /chat] Message: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}" — history: ${conversationHistory?.length || 0} msgs — model: ${model || 'default'}`);

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check for API keys (OpenRouter primary, Gemini fallback)
    if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: 'No API key configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    // Stream response as Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of runAgent(message, { mode, projectId, conversationHistory, model, temperature, maxTokens })) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          console.log(`[API /chat] Stream complete in ${Date.now() - reqStart}ms`);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', content: errMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
