# Eva Dashboard

A Next.js dashboard for viewing and managing evaluation results stored in the database.

## Features

- **Project Management**: Create, view, and delete projects to organize your evaluations
- **Evaluation Results Table**: View evaluation results with dynamic scorer columns
- **Dynamic Columns**: The results table automatically adapts to show all scorer columns from your evaluation runs
- **Sortable Results**: Click on any column header to sort evaluation results
- **Delete Functionality**: Safely delete projects, evaluations, or evaluation runs with confirmation dialogs
- **Responsive Design**: Built with shadcn/ui components for a modern, responsive interface

## Getting Started

### Prerequisites

- PostgreSQL database configured (see packages/db README)
- Bun package manager installed
- DATABASE_URL environment variable set

### Installation

1. From the root directory:

```bash
bun install
```

2. Create a `.env` file in the root directory with your database connection:

```env
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### Development

Run the development server:

```bash
bun run dev --filter=@eva/dash
```

Or from the apps/dash directory:

```bash
bun dev
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000)

## Usage

1. **Create a Project**: Click "Create Project" on the projects page to create a new project
2. **View Evaluations**: Click on a project to see its evaluation runs
3. **View Results**: Click "View Results" on an evaluation run to see the detailed results table
4. **Delete Items**:
   - Hover over a project card to see the delete button
   - On the project detail page, use the "Delete" button to remove the entire project
   - Delete individual evaluations or evaluation runs using their respective delete buttons
   - All deletions require confirmation to prevent accidental data loss

## Results Table

The results table displays:

- **Input**: The input data for each evaluation item
- **Output**: The actual output from the evaluation
- **Expected**: The expected output (if provided)
- **Tags**: Any tags associated with the result (stored in metadata.tags)
- **Dynamic Scorer Columns**: Each unique scorer found in the results gets its own column

## Architecture

- **Next.js 14**: Using App Router for modern React Server Components
- **shadcn/ui**: For UI components
- **Tailwind CSS**: For styling
- **Server Actions**: For database interactions
- **TypeScript**: For type safety

## Database Schema

The dashboard works with the following database tables:

- `projects`: Stores project information
- `evalNames`: Different evaluation types within a project
- `evalRuns`: Individual evaluation runs
- `evalResults`: Individual evaluation results with scores
