# @eva/db - Database Package

This package provides type-safe database operations for the Eva evaluation framework using Drizzle ORM with Supabase.

## Architecture

The database follows a hierarchical structure:
```
projects → evalNames → evalRuns → evalResults
```

- **Projects**: Top-level logical grouping of evaluations
- **EvalNames**: Different types of evaluations within a project
- **EvalRuns**: Individual execution instances of an evaluation
- **EvalResults**: Individual results within an evaluation run

## Database Schema

### Core Tables

#### Projects
```typescript
interface Project {
  id: string;
  name: string; // unique identifier
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### EvalNames
```typescript
interface EvalName {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### EvalRuns
```typescript
interface EvalRun {
  id: string;
  evalNameId: string;
  status: 'running' | 'completed' | 'failed';
  maxConcurrency: number;
  totalItems: number;
  completedItems: number;
  outputDir?: string;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}
```

#### EvalResults
```typescript
interface EvalResult {
  id: string;
  evalRunId: string;
  itemIndex: number;
  input: EvalResultInput;      // JSONB - flexible input data
  expected?: EvalResultExpected; // JSONB - expected output
  output: EvalResultOutput;    // JSONB - actual output
  scores: EvalScore[];         // JSONB - array of score objects
  metadata?: EvalResultMetadata; // JSONB - additional metadata
  createdAt: Date;
}
```

## Basic Operations

### Create Operations
```typescript
import { createProject, createEvalName, createEvalRun, createEvalResult } from '@eva/db';

// Create project (must be done through dashboard UI)
const project = await createProject({
  name: 'AI Model Evaluation',
  description: 'Evaluating our latest AI model'
});

// Create evaluation name
const evalName = await createEvalName({
  projectId: project.id,
  name: 'accuracy-test',
  description: 'Testing model accuracy'
});

// Create evaluation run
const evalRun = await createEvalRun({
  evalNameId: evalName.id,
  maxConcurrency: 10,
  totalItems: 1000,
  outputDir: './results'
});

// Create evaluation result
const result = await createEvalResult({
  evalRunId: evalRun.id,
  itemIndex: 0,
  input: { question: 'What is 2+2?' },
  expected: { answer: '4' },
  output: { answer: '4', confidence: 0.99 },
  scores: [
    { name: 'exact_match', value: 1.0 },
    { name: 'confidence', value: 0.99 }
  ],
  metadata: { model_version: 'v1.2.3' }
});
```

### Read Operations

#### Find or Create Context
```typescript
import { findOrCreateEvalContext } from '@eva/db';

// Finds existing project and creates evalName if it doesn't exist
// Project must already exist (created through dashboard)
const context = await findOrCreateEvalContext({
  projectName: 'AI Model Evaluation',
  evalName: 'accuracy-test',
  evalDescription: 'Testing model accuracy'
});
```

## Advanced Query Operations

### Get Evaluation Runs
```typescript
import { getEvalRuns } from '@eva/db';

// Get recent evaluation runs with filtering
const runs = await getEvalRuns(evalNameId, {
  limit: 20,
  offset: 0,
  status: 'completed',
  orderBy: 'newest'
});
```

### Get Evaluation Results
```typescript
import { getEvalResults } from '@eva/db';

// Get evaluation results with pagination
const results = await getEvalResults(evalRunId, {
  limit: 100,
  offset: 0
});
```

### Get Evaluation Statistics
```typescript
import { getEvalRunStats } from '@eva/db';

// Get aggregated statistics for an evaluation run
const stats = await getEvalRunStats(evalRunId);
// Returns: { totalResults: number, avgScores: Record<string, number> }
```

### Get Runs with Statistics
```typescript
import { getEvalRunsWithStats } from '@eva/db';

// Get evaluation runs with their result counts
const runsWithStats = await getEvalRunsWithStats(evalNameId);
```

### Get Project Hierarchy
```typescript
import { getProjectHierarchy } from '@eva/db';

// Get complete project structure with run counts
const hierarchy = await getProjectHierarchy();
```

### Search Evaluation Results
```typescript
import { searchEvalResults } from '@eva/db';

// Search results by content
const searchResults = await searchEvalResults(evalRunId, 'error', {
  limit: 50,
  searchIn: 'output', // 'input' | 'output' | 'expected' | 'all'
});
```

### Filter Results by Score
```typescript
import { getEvalResultsByScore } from '@eva/db';

// Get results filtered by score values
const highAccuracyResults = await getEvalResultsByScore(
  evalRunId,
  'accuracy',
  {
    minValue: 0.9,
    maxValue: 1.0,
    orderBy: 'score_desc',
    limit: 100
  }
);
```

## Bulk Operations

### Bulk Create Results
```typescript
import { bulkCreateEvalResults } from '@eva/db';

// Efficiently insert large numbers of results
const results = await bulkCreateEvalResults([
  {
    evalRunId: 'run-id',
    itemIndex: 0,
    input: { question: 'What is AI?' },
    output: { answer: 'Artificial Intelligence' },
    scores: [{ name: 'accuracy', value: 1.0 }]
  },
  // ... more results
]);
```

## Configuration

### Environment Variables
```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Connection Setup
The package automatically configures connection pooling optimized for Supabase:
- Prepared statements disabled for compatibility
- Connection pool size: 20
- Idle timeout: 20 seconds
- Max lifetime: 30 minutes

## Type Safety

All operations are fully type-safe with TypeScript:

```typescript
// Input/Output types are flexible JSONB with proper typing
interface EvalResultInput {
  [key: string]: unknown;
}

interface EvalScore {
  name: string;
  value: number;
  [key: string]: unknown; // Additional properties allowed
}
```

## Migration Commands

```bash
# Push schema changes to database
npm run db:push

# Open Drizzle Studio for database management
npm run db:studio

# Generate migration files
npm run db:generate
```

## Best Practices

1. **Use the context helper**: `findOrCreateEvalContext()` handles the common pattern of finding projects and creating eval names
2. **Batch operations**: Use `bulkCreateEvalResults()` for large datasets
3. **Pagination**: Always use `limit` and `offset` for large result sets
4. **Type safety**: Leverage TypeScript interfaces for compile-time safety
5. **Connection pooling**: The package handles connection management automatically
6. **JSONB queries**: Use the provided query functions for efficient JSONB filtering

## Examples

See the Eva framework integration in `apps/eval` for real-world usage examples of storing evaluation results with proper type conversion from generic types to database types.