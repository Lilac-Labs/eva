import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEvalRunWithResults } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { EvalResultsTable } from '@/components/eval-results-table';

export default async function EvalRunPage({
  params,
}: {
  params: { projectId: string; runId: string };
}) {
  const runResult = await getEvalRunWithResults(params.runId);

  if (!runResult.success || !runResult.data) {
    notFound();
  }

  const run = runResult.data;

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <Link href={`/projects/${params.projectId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
        </Link>

        <h1 className="text-3xl font-bold">{run.evalName.name}</h1>
        <div className="flex gap-4 text-sm text-muted-foreground mt-2">
          <span>Project: {run.evalName.project.name}</span>
          <span>•</span>
          <span>Status: {run.status}</span>
          <span>•</span>
          <span>
            Progress: {run.completedItems}/{run.totalItems}
          </span>
        </div>
      </div>

      <EvalResultsTable results={run.results} />
    </div>
  );
}
