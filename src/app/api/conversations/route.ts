import { NextRequest } from 'next/server';
import { dbGetConversations, dbCreateConversation, dbDeleteConversation, dbUpdateConversation, dbAddMessage, dbUpdateMessage } from '@/lib/supabase/db';

export async function GET() {
  try {
    const conversations = await dbGetConversations();
    return Response.json({ conversations });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Failed to load conversations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const conversation = await dbCreateConversation(body.mode || 'chat', body.projectId, body.id);
        return Response.json({ conversation });
      }

      case 'update_title': {
        await dbUpdateConversation(body.id, { title: body.title });
        return Response.json({ success: true });
      }

      case 'delete': {
        await dbDeleteConversation(body.id);
        return Response.json({ success: true });
      }

      case 'add_message': {
        const message = await dbAddMessage({
          conversationId: body.conversationId,
          role: body.role,
          content: body.content,
          toolCalls: body.toolCalls,
          sources: body.sources,
          id: body.id,
        });
        return Response.json({ message });
      }

      case 'update_message': {
        await dbUpdateMessage(body.id, {
          content: body.content,
          toolCalls: body.toolCalls,
          sources: body.sources,
        });
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
