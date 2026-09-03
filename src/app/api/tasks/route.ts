import { NextRequest } from 'next/server';
import { dbGetTasks, dbCreateTask, dbUpdateTask, dbDeleteTask } from '@/lib/supabase/db';

export async function GET() {
  try {
    const tasks = await dbGetTasks();
    return Response.json({ tasks });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Failed to load tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const task = await dbCreateTask({
          title: body.title,
          description: body.description,
          priority: body.priority,
          status: body.status,
          projectId: body.projectId,
        });
        return Response.json({ task });
      }

      case 'update': {
        await dbUpdateTask(body.id, {
          title: body.title,
          description: body.description,
          priority: body.priority,
          status: body.status,
        });
        return Response.json({ success: true });
      }

      case 'delete': {
        await dbDeleteTask(body.id);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
