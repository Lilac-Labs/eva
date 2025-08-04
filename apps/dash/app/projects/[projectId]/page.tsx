import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getProjectWithEvals } from '@/lib/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectDeleteButton } from '@/components/project-delete-button';
import { EvalDeleteButton } from '@/components/eval-delete-button';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

export default async function ProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  const projectResult = await getProjectWithEvals(params.projectId);

  if (!projectResult.success || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data;

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>

        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-2">
                {project.description}
              </p>
            )}
          </div>
          <ProjectDeleteButton
            projectId={params.projectId}
            projectName={project.name}
          />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Evaluations</h2>

        {project.evalNames.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No evaluations found for this project.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {project.evalNames.map((evalName) => {
              const latestRun = evalName.evalRuns[0];

              return (
                <Card key={evalName.id} className="relative">
                  <div className="absolute top-2 right-2">
                    <EvalDeleteButton
                      evalNameId={evalName.id}
                      itemName={evalName.name}
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{evalName.name}</CardTitle>
                    {evalName.description && (
                      <CardDescription>{evalName.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {latestRun ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">
                            <p>
                              Status:{' '}
                              <span className="font-medium">
                                {latestRun.status}
                              </span>
                            </p>
                            <p>
                              Started:{' '}
                              {format(new Date(latestRun.startedAt), 'PPp')}
                            </p>
                            <p>
                              Progress: {latestRun.completedItems}/
                              {latestRun.totalItems}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={`/projects/${params.projectId}/runs/${latestRun.id}`}
                            >
                              <Button>View Results</Button>
                            </Link>
                            <EvalDeleteButton
                              evalRunId={latestRun.id}
                              itemName={`Run from ${format(new Date(latestRun.startedAt), 'PPp')}`}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No runs yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
