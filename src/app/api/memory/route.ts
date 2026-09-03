import { NextRequest } from 'next/server';
import { dbGetMemories, dbCreateMemory, dbDeleteMemory } from '@/lib/supabase/db';

export async function GET() {
  try {
    const memories = await dbGetMemories();
    return Response.json({ memories });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Failed to load memories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const memory = await dbCreateMemory({
          content: body.content,
          type: body.type,
          projectId: body.projectId,
          importance: body.importance,
        });
        return Response.json({ memory });
      }

      case 'delete': {
        await dbDeleteMemory(body.id);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
