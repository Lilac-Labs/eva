# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Monorepo Scripts (run from root)
- `npm run dev` - Start development mode for all apps
- `npm run build` - Build all apps using Turbo
- `npm run test` - Run tests for all apps
- `npm run lint` - Lint all apps
- `npm run lint:fix` - Fix linting issues across all apps
- `npm run check-types` - Type check all apps
- `npm run clean` - Clean build artifacts across all apps

### App-specific Commands (apps/eval)
- `npm run build` - Compile TypeScript and resolve path aliases using tsc-alias
- `npm run test` - Run tests using Bun test runner
- `npm run test:coverage` - Run tests with coverage reporting
- `npm run prepublishOnly` - Build, test, and lint before publishing

### Database Commands (run from root)
- `npm run db:generate` - Generate migration files from schema changes
- `npm run db:push` - Push schema changes directly (development only)
- `npm run db:studio` - Open Drizzle Studio for database management
- `npm run db:pull` - Introspect existing database and generate schema
- `npm run db:check` - Check for schema drift between code and database
- `npm run db:drop` - Drop migration files (use with caution)

## Architecture

This is a Turborepo monorepo containing the Eva ecosystem of evaluation tools.

### Workspace Structure
- **Root**: Workspace orchestration using Turbo with npm workspaces
- **apps/eval**: Eva TypeScript evaluation framework (publishable as `eva-ts`)
- **apps/dash**: Dashboard app (placeholder, not implemented)
- **packages/db**: Shared database package with Drizzle ORM and Supabase integration

### Core Eva Framework (apps/eval)

**Main Eval Class**: Generic evaluation engine supporting `<Input, Expected, Output, Score>` types with:
- Concurrent execution using `p-limit` with configurable concurrency
- Progress tracking via `cli-progress` 
- Optional JSONL output file generation for results
- Optional database storage of evaluation runs and results via `@eva/db`
- Generic scorer system supporting multiple scoring functions

**Key Types**:
- `DataItem<Input, Expected>`: Test data structure with input, expected output, and metadata
- `BaseScore`: Base interface for scoring results with name and value
- `EvalConfig`: Configuration including name, concurrency limits, output directory, and optional database settings (projectName, evalDescription)

### Database Architecture (packages/db)

**Schema Structure**: Hierarchical organization with four main tables:
- `projects` → `evalNames` → `evalRuns` → `evalResults`
- Projects are the top-level entity, created through dashboard UI
- Each project can have multiple evaluation types (evalNames)
- Each evaluation type can have multiple runs with individual results
- JSONB fields for flexible data storage (input, expected, output, scores, metadata)

**Connection**: Configured for Supabase with transaction pooler support and optimized connection settings

**Advanced Query Operations**:
- Pagination and filtering for evaluation runs and results
- Content search across JSONB fields using PostgreSQL full-text search
- Score-based filtering with JSONB queries for performance analysis
- Statistical aggregations (averages, counts) across evaluation runs
- Project hierarchy views with run counts (no organization dependency)
- Bulk operations for efficient large-dataset handling

### Technical Details
- Uses ES modules with `.js` extensions in imports (compiled from TypeScript)
- Path mapping: `@lib/*` → `./src/lib/*` (apps/eval), `@/*` → `./src/*` (packages/db)
- Bun as test runner and package manager
- TypeScript with strict configuration and comprehensive ESLint rules
- tsc-alias for resolving path aliases in compiled output
- Unit tests automatically skip database operations when no database config is provided