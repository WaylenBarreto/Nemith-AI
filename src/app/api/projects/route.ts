import { NextRequest } from 'next/server';
import { dbGetProjects, dbCreateProject, dbUpdateProject, dbDeleteProject } from '@/lib/supabase/db';

export async function GET() {
  try {
    const projects = await dbGetProjects();
    return Response.json({ projects });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Failed to load projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const project = await dbCreateProject({
          name: body.name,
          description: body.description || '',
          githubRepo: body.githubRepo,
        });
        return Response.json({ project });
      }

      case 'update': {
        await dbUpdateProject(body.id, {
          name: body.name,
          description: body.description,
          githubRepo: body.githubRepo,
        });
        return Response.json({ success: true });
      }

      case 'delete': {
        await dbDeleteProject(body.id);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
