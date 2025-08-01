import { getProjects } from '@/lib/actions';
import { ProjectsList } from '@/components/projects-list';
import { CreateProjectDialog } from '@/components/create-project-dialog';

export default async function ProjectsPage() {
  const projectsResult = await getProjects();
  const projects = projectsResult.success ? projectsResult.data : [];

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <CreateProjectDialog />
      </div>

      {projectsResult.success ? (
        <ProjectsList projects={projects} />
      ) : (
        <div className="text-center text-muted-foreground">
          Failed to load projects. Please try again.
        </div>
      )}
    </div>
  );
}
