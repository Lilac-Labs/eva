import { mock } from 'bun:test';

// Mock implementation of @repo/db for unit tests
// This ensures tests can run without database connectivity

export const mockDb = () => ({
  bulkCreateEvalResults: mock(() => Promise.resolve()),
  completeEvalRun: mock(() => Promise.resolve()),
  createEvalRun: mock(() => Promise.resolve({ id: 'mock-run-id' })),
  failEvalRun: mock(() => Promise.resolve()),
  findOrCreateEvalContext: mock(() =>
    Promise.resolve({
      project: { id: 'mock-project-id', name: 'mock-project' },
      evalName: { id: 'mock-eval-name-id', name: 'mock-eval' },
    }),
  ),
  updateEvalRunProgress: mock(() => Promise.resolve()),
});
