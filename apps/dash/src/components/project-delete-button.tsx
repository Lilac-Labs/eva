'use client';

import { useRouter } from 'next/navigation';
import { DeleteButton } from '@/components/delete-button';
import { deleteProject } from '@/lib/actions';

interface ProjectDeleteButtonProps {
  projectId: string;
  projectName: string;
}

export function ProjectDeleteButton({
  projectId,
  projectName,
}: ProjectDeleteButtonProps) {
  const router = useRouter();

  return (
    <DeleteButton
      onDelete={() => deleteProject(projectId)}
      itemType="project"
      itemName={projectName}
      onSuccess={() => router.push('/projects')}
    />
  );
}
