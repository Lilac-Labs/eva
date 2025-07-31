import {
  pgTable,
  varchar,
  uuid,
  timestamp,
  integer,
  jsonb,
  text,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Eval names table (represents different evaluation types within a project)
export const evalNames = pgTable('eval_names', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Eval runs table (individual evaluation runs)
export const evalRuns = pgTable('eval_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  evalNameId: uuid('eval_name_id')
    .notNull()
    .references(() => evalNames.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('running'), // running, completed, failed
  maxConcurrency: integer('max_concurrency').notNull(),
  totalItems: integer('total_items').notNull(),
  completedItems: integer('completed_items').notNull().default(0),
  outputDir: varchar('output_dir', { length: 500 }),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'), // Additional run metadata
});

// Type definitions for JSONB fields
export interface EvalResultInput {
  [key: string]: unknown;
}

export interface EvalResultExpected {
  [key: string]: unknown;
}

export interface EvalResultOutput {
  [key: string]: unknown;
}

export interface EvalScore {
  name: string;
  value: number;
  [key: string]: unknown;
}

export interface EvalResultMetadata {
  [key: string]: unknown;
}

// Eval results table (individual evaluation results within a run)
export const evalResults = pgTable('eval_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  evalRunId: uuid('eval_run_id')
    .notNull()
    .references(() => evalRuns.id, { onDelete: 'cascade' }),
  itemIndex: integer('item_index').notNull(),
  input: jsonb('input').$type<EvalResultInput>().notNull(),
  expected: jsonb('expected').$type<EvalResultExpected>(),
  output: jsonb('output').$type<EvalResultOutput>().notNull(),
  scores: jsonb('scores').$type<EvalScore[]>().notNull(),
  metadata: jsonb('metadata').$type<EvalResultMetadata>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  evalNames: many(evalNames),
}));

export const evalNamesRelations = relations(evalNames, ({ one, many }) => ({
  project: one(projects, {
    fields: [evalNames.projectId],
    references: [projects.id],
  }),
  evalRuns: many(evalRuns),
}));

export const evalRunsRelations = relations(evalRuns, ({ one, many }) => ({
  evalName: one(evalNames, {
    fields: [evalRuns.evalNameId],
    references: [evalNames.id],
  }),
  results: many(evalResults),
}));

export const evalResultsRelations = relations(evalResults, ({ one }) => ({
  evalRun: one(evalRuns, {
    fields: [evalResults.evalRunId],
    references: [evalRuns.id],
  }),
}));

// Export types

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type EvalName = typeof evalNames.$inferSelect;
export type NewEvalName = typeof evalNames.$inferInsert;

export type EvalRun = typeof evalRuns.$inferSelect;
export type NewEvalRun = typeof evalRuns.$inferInsert;

export type EvalResult = typeof evalResults.$inferSelect;
export type NewEvalResult = typeof evalResults.$inferInsert;
