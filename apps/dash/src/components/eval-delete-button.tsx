'use client';

import { DeleteButton } from '@/components/delete-button';
import { deleteEvalName, deleteEvalRun } from '@/lib/actions';

interface EvalDeleteButtonProps {
  evalNameId?: string;
  evalRunId?: string;
  itemName: string;
}

export function EvalDeleteButton({
  evalNameId,
  evalRunId,
  itemName,
}: EvalDeleteButtonProps) {
  if (evalNameId) {
    return (
      <DeleteButton
        onDelete={() => deleteEvalName(evalNameId)}
        itemType="evaluation"
        itemName={itemName}
        variant="icon"
      />
    );
  }

  if (evalRunId) {
    return (
      <DeleteButton
        onDelete={() => deleteEvalRun(evalRunId)}
        itemType="evaluation run"
        itemName={itemName}
        variant="icon"
      />
    );
  }

  return null;
}
