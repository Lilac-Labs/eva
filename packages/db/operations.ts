import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { db } from './connection.js';
import {
  projects,
  evalNames,
  evalRuns,
  evalResults,
  type Project,
  type EvalName,
  type EvalRun,
  type NewProject,
  type NewEvalName,
  type NewEvalRun,
  type EvalResultInput,
  type EvalResultExpected,
  type EvalResultOutput,
  type EvalScore,
  type EvalResultMetadata,
} from './schema.js';

// Project operations
export const createProject = async (data: NewProject): Promise<Project> => {
  const [project] = await db.insert(projects).values(data).returning();
  if (!project) {
    throw new Error('Failed to create project');
  }
  return project;
};

export const getProjectByName = async (
  name: string,
): Promise<Project | null> => {
  const results = await db
    .select()
    .from(projects)
    .where(eq(projects.name, name))
    .limit(1);
  return results[0] ?? null;
};

// Eval name operations
export const createEvalName = async (data: NewEvalName): Promise<EvalName> => {
  const [evalName] = await db.insert(evalNames).values(data).returning();
  if (!evalName) {
    throw new Error('Failed to create eval name');
  }
  return evalName;
};

export const getEvalNameByName = async (
  projectId: string,
  name: string,
): Promise<EvalName | null> => {
  const results = await db
    .select()
    .from(evalNames)
    .where(and(eq(evalNames.projectId, projectId), eq(evalNames.name, name)))
    .limit(1);
  return results[0] ?? null;
};

// Eval run operations
export const createEvalRun = async (data: NewEvalRun): Promise<EvalRun> => {
  const [evalRun] = await db.insert(evalRuns).values(data).returning();
  if (!evalRun) {
    throw new Error('Failed to create eval run');
  }
  return evalRun;
};

export const updateEvalRunProgress = async (
  runId: string,
  completedItems: number,
): Promise<EvalRun> => {
  const [evalRun] = await db
    .update(evalRuns)
    .set({ completedItems })
    .where(eq(evalRuns.id, runId))
    .returning();
  if (!evalRun) {
    throw new Error('Failed to update eval run progress');
  }
  return evalRun;
};

export const completeEvalRun = async (runId: string): Promise<EvalRun> => {
  const [evalRun] = await db
    .update(evalRuns)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(evalRuns.id, runId))
    .returning();
  if (!evalRun) {
    throw new Error('Failed to complete eval run');
  }
  return evalRun;
};

export const failEvalRun = async (runId: string): Promise<EvalRun> => {
  const [evalRun] = await db
    .update(evalRuns)
    .set({
      status: 'failed',
      completedAt: new Date(),
    })
    .where(eq(evalRuns.id, runId))
    .returning();
  if (!evalRun) {
    throw new Error('Failed to fail eval run');
  }
  return evalRun;
};

// Typed eval result creation
export interface TypedEvalResultData {
  evalRunId: string;
  itemIndex: number;
  input: EvalResultInput;
  expected?: EvalResultExpected;
  output: EvalResultOutput;
  scores: EvalScore[];
  metadata?: EvalResultMetadata;
}

// Eval result operations
export const createEvalResult = async (data: TypedEvalResultData) => {
  const [result] = await db
    .insert(evalResults)
    .values({
      evalRunId: data.evalRunId,
      itemIndex: data.itemIndex,
      input: data.input,
      expected: data.expected ?? null,
      output: data.output,
      scores: data.scores,
      metadata: data.metadata ?? null,
    })
    .returning();

  if (!result) {
    throw new Error('Failed to create eval result');
  }
  return result;
};

export const createEvalResults = async (data: TypedEvalResultData[]) => {
  if (data.length === 0) return [];

  const insertData = data.map((item) => ({
    evalRunId: item.evalRunId,
    itemIndex: item.itemIndex,
    input: item.input,
    expected: item.expected ?? null,
    output: item.output,
    scores: item.scores,
    metadata: item.metadata ?? null,
  }));

  const results = await db.insert(evalResults).values(insertData).returning();
  return results;
};

// Helper function to find project and create eval name if needed
export const findOrCreateEvalContext = async ({
  projectName,
  evalName,
  evalDescription,
}: {
  projectName: string;
  evalName: string;
  evalDescription?: string;
}) => {
  // Find project - error if it doesn't exist
  const project = await getProjectByName(projectName);
  if (project === null) {
    throw new Error(`Project "${projectName}" not found. Projects must be created through the dashboard.`);
  }
  
  // Find or create eval name
  let evalNameRecord = await getEvalNameByName(project.id, evalName);
  if (evalNameRecord === null) {
    evalNameRecord = await createEvalName({
      projectId: project.id,
      name: evalName,
      description: evalDescription ?? null,
    });
  }
  
  return {
    project,
    evalName: evalNameRecord,
  };
};

// Advanced query operations for retrieving evaluation data

// Get evaluation runs with pagination and filtering
export const getEvalRuns = async (
  evalNameId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: 'running' | 'completed' | 'failed';
    orderBy?: 'newest' | 'oldest';
  } = {},
) => {
  const { limit = 50, offset = 0, status, orderBy = 'newest' } = options;

  const conditions = [eq(evalRuns.evalNameId, evalNameId)];
  if (status) {
    conditions.push(eq(evalRuns.status, status));
  }
  const whereCondition =
    conditions.length > 1 ? and(...conditions) : conditions[0];

  const query = db
    .select({
      id: evalRuns.id,
      status: evalRuns.status,
      maxConcurrency: evalRuns.maxConcurrency,
      totalItems: evalRuns.totalItems,
      completedItems: evalRuns.completedItems,
      outputDir: evalRuns.outputDir,
      startedAt: evalRuns.startedAt,
      completedAt: evalRuns.completedAt,
      metadata: evalRuns.metadata,
    })
    .from(evalRuns)
    .where(whereCondition)
    .orderBy(
      orderBy === 'newest' ? desc(evalRuns.startedAt) : asc(evalRuns.startedAt),
    )
    .limit(limit)
    .offset(offset);

  return await query;
};

// Get evaluation results with filtering and pagination
export const getEvalResults = async (
  evalRunId: string,
  options: {
    limit?: number;
    offset?: number;
    minScore?: number;
    maxScore?: number;
    scoreName?: string;
  } = {},
) => {
  const { limit = 100, offset = 0 } = options;

  const query = db
    .select({
      id: evalResults.id,
      itemIndex: evalResults.itemIndex,
      input: evalResults.input,
      expected: evalResults.expected,
      output: evalResults.output,
      scores: evalResults.scores,
      metadata: evalResults.metadata,
      createdAt: evalResults.createdAt,
    })
    .from(evalResults)
    .where(eq(evalResults.evalRunId, evalRunId))
    .orderBy(asc(evalResults.itemIndex))
    .limit(limit)
    .offset(offset);

  return await query;
};

// Get evaluation statistics
export const getEvalRunStats = async (evalRunId: string) => {
  const [stats] = await db
    .select({
      totalResults: count(evalResults.id),
      avgScores: sql<Record<string, number>>`
        jsonb_object_agg(
          score_item->>'name',
          AVG((score_item->>'value')::float)
        )
      `.as('avgScores'),
    })
    .from(evalResults)
    .where(eq(evalResults.evalRunId, evalRunId))
    .leftJoin(
      sql`jsonb_array_elements(${evalResults.scores}) as score_item`,
      sql`true`,
    );

  return stats;
};

// Get evaluation runs with their basic statistics
export const getEvalRunsWithStats = async (evalNameId: string) => {
  return await db
    .select({
      id: evalRuns.id,
      status: evalRuns.status,
      totalItems: evalRuns.totalItems,
      completedItems: evalRuns.completedItems,
      startedAt: evalRuns.startedAt,
      completedAt: evalRuns.completedAt,
      resultCount: count(evalResults.id),
    })
    .from(evalRuns)
    .leftJoin(evalResults, eq(evalRuns.id, evalResults.evalRunId))
    .where(eq(evalRuns.evalNameId, evalNameId))
    .groupBy(evalRuns.id)
    .orderBy(desc(evalRuns.startedAt));
};

// Get project hierarchy with counts
export const getProjectHierarchy = async () => {
  return await db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      projectDescription: projects.description,
      evalNameId: evalNames.id,
      evalNameName: evalNames.name,
      evalNameDescription: evalNames.description,
      runCount: count(evalRuns.id),
    })
    .from(projects)
    .leftJoin(evalNames, eq(projects.id, evalNames.projectId))
    .leftJoin(evalRuns, eq(evalNames.id, evalRuns.evalNameId))
    .groupBy(projects.id, evalNames.id)
    .orderBy(asc(projects.name), asc(evalNames.name));
};

// Search evaluation results by content
export const searchEvalResults = async (
  evalRunId: string,
  searchTerm: string,
  options: {
    limit?: number;
    offset?: number;
    searchIn?: 'input' | 'output' | 'expected' | 'all';
  } = {},
) => {
  const { limit = 50, offset = 0, searchIn = 'all' } = options;

  let searchConditions = [];

  if (searchIn === 'input' || searchIn === 'all') {
    searchConditions.push(
      sql`${evalResults.input}::text ILIKE ${'%' + searchTerm + '%'}`,
    );
  }
  if (searchIn === 'output' || searchIn === 'all') {
    searchConditions.push(
      sql`${evalResults.output}::text ILIKE ${'%' + searchTerm + '%'}`,
    );
  }
  if (searchIn === 'expected' || searchIn === 'all') {
    searchConditions.push(
      sql`${evalResults.expected}::text ILIKE ${'%' + searchTerm + '%'}`,
    );
  }

  const searchCondition =
    searchConditions.length > 0
      ? sql`(${sql.join(searchConditions, sql` OR `)})`
      : sql`FALSE`;

  const whereCondition = and(
    eq(evalResults.evalRunId, evalRunId),
    searchCondition,
  );

  return await db
    .select()
    .from(evalResults)
    .where(whereCondition)
    .orderBy(asc(evalResults.itemIndex))
    .limit(limit)
    .offset(offset);
};

// Get evaluation results with score filtering
export const getEvalResultsByScore = async (
  evalRunId: string,
  scoreName: string,
  options: {
    minValue?: number;
    maxValue?: number;
    limit?: number;
    offset?: number;
    orderBy?: 'score_asc' | 'score_desc' | 'index';
  } = {},
) => {
  const {
    minValue,
    maxValue,
    limit = 100,
    offset = 0,
    orderBy = 'index',
  } = options;

  let whereConditions = [eq(evalResults.evalRunId, evalRunId)];

  // Add score filtering using JSONB operations
  if (minValue !== undefined) {
    whereConditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements(${evalResults.scores}) as score
        WHERE score->>'name' = ${scoreName} 
        AND (score->>'value')::float >= ${minValue}
      )`,
    );
  }

  if (maxValue !== undefined) {
    whereConditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements(${evalResults.scores}) as score
        WHERE score->>'name' = ${scoreName} 
        AND (score->>'value')::float <= ${maxValue}
      )`,
    );
  }

  const whereCondition =
    whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

  // Determine ordering
  let orderByClause;
  if (orderBy === 'score_asc') {
    orderByClause = sql`(
      SELECT (score->>'value')::float 
      FROM jsonb_array_elements(${evalResults.scores}) as score
      WHERE score->>'name' = ${scoreName}
      LIMIT 1
    ) ASC`;
  } else if (orderBy === 'score_desc') {
    orderByClause = sql`(
      SELECT (score->>'value')::float 
      FROM jsonb_array_elements(${evalResults.scores}) as score
      WHERE score->>'name' = ${scoreName}
      LIMIT 1
    ) DESC`;
  } else {
    orderByClause = asc(evalResults.itemIndex);
  }

  return await db
    .select()
    .from(evalResults)
    .where(whereCondition)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);
};

// Bulk operations for better performance
export const bulkCreateEvalResults = async (results: TypedEvalResultData[]) => {
  if (results.length === 0) return [];

  // Process in batches of 1000 for better performance
  const batchSize = 1000;
  const allResults = [];

  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const batchResults = await createEvalResults(batch);
    allResults.push(...batchResults);
  }

  return allResults;
};

// Re-export types that are used in this module
export type {
  EvalRun,
  EvalResultInput,
  EvalResultExpected,
  EvalResultOutput,
  EvalScore,
  EvalResultMetadata,
};
