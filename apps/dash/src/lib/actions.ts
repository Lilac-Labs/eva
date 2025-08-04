'use server';

import { db } from '@repo/db';
import { projects, evalNames, evalRuns, evalResults } from '@repo/db';
import { eq, desc } from 'drizzle-orm';

export async function getProjects() {
  try {
    const result = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { success: false, error: 'Failed to fetch projects' };
  }
}

export async function createProject(name: string, description?: string) {
  try {
    const [project] = await db
      .insert(projects)
      .values({
        name,
        description,
      })
      .returning();

    return { success: true, data: project };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error: 'Failed to create project' };
  }
}

export async function getProjectWithEvals(projectId: string) {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        evalNames: {
          with: {
            evalRuns: {
              orderBy: [desc(evalRuns.startedAt)],
              limit: 1,
            },
          },
        },
      },
    });

    return { success: true, data: project };
  } catch (error) {
    console.error('Error fetching project:', error);
    return { success: false, error: 'Failed to fetch project' };
  }
}

export async function getEvalResults(evalRunId: string) {
  try {
    const results = await db
      .select()
      .from(evalResults)
      .where(eq(evalResults.evalRunId, evalRunId))
      .orderBy(evalResults.itemIndex);

    return { success: true, data: results };
  } catch (error) {
    console.error('Error fetching eval results:', error);
    return { success: false, error: 'Failed to fetch eval results' };
  }
}

export async function getEvalRunWithResults(evalRunId: string) {
  try {
    const run = await db.query.evalRuns.findFirst({
      where: eq(evalRuns.id, evalRunId),
      with: {
        evalName: {
          with: {
            project: true,
          },
        },
        results: {
          orderBy: [evalResults.itemIndex],
        },
      },
    });

    return { success: true, data: run };
  } catch (error) {
    console.error('Error fetching eval run:', error);
    return { success: false, error: 'Failed to fetch eval run' };
  }
}

export async function deleteProject(projectId: string) {
  try {
    // Delete project and all related data (cascade delete)
    await db.delete(projects).where(eq(projects.id, projectId));

    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: 'Failed to delete project' };
  }
}

export async function deleteEvalRun(evalRunId: string) {
  try {
    // Delete eval run and all related results (cascade delete)
    await db.delete(evalRuns).where(eq(evalRuns.id, evalRunId));

    return { success: true };
  } catch (error) {
    console.error('Error deleting eval run:', error);
    return { success: false, error: 'Failed to delete eval run' };
  }
}

export async function deleteEvalName(evalNameId: string) {
  try {
    // Delete eval name and all related runs and results (cascade delete)
    await db.delete(evalNames).where(eq(evalNames.id, evalNameId));

    return { success: true };
  } catch (error) {
    console.error('Error deleting eval name:', error);
    return { success: false, error: 'Failed to delete eval name' };
  }
}
