# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
- `npm run lint` - Run ESLint to check code style and potential issues
- `npm run lint:fix` - Run ESLint with automatic fixes
- `npm run check-types` - Run TypeScript type checking without emitting files
- `npm run clean` - Remove build artifacts and node_modules

### Build & Test
- `npm run test` - Run all tests using Bun test runner

## Architecture

Eva is a TypeScript evaluation framework designed for running concurrent evaluations with progress tracking and result persistence.

### Core Components

**Eval Class (`src/eval.ts`)**: The main evaluation engine that orchestrates the evaluation process. It handles:
- Generic type system supporting Input, Expected, Output, and Score types
- Concurrent execution with configurable limits using `p-limit`
- Progress tracking with CLI progress bars
- Optional JSONL output file generation
- Score calculation and statistics

**Key Interfaces**:
- `DataItem<Input, Expected>`: Represents test data with input, expected output, and metadata
- `BaseScore`: Base interface for scoring results with name and value fields
- `EvalConfig`: Configuration for evaluation name, concurrency, and output directory

**Utils (`src/lib/utils/numbers.ts`)**: Mathematical utilities including `calculateAverage` function.

### Module System
- Uses ES modules with `.ts` extensions
- Path mapping configured: `@lib/*` maps to `./src/lib/*`
- Exports main functionality through `src/index.ts`

### Code Style
- Strict TypeScript configuration with comprehensive ESLint rules
- Private fields using `#` syntax
- Explicit return types required for functions
- Import/export sorting enforced
- No `any` types allowed